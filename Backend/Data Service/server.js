/**
 * Intervista Data Service — server.js
 * ─────────────────────────────────────────────────────────────────────────
 * Port: 5003
 * Purpose: Replaces the Python Verification Module backend (port 8003).
 *          Handles all pure-data routes: test lookup, module result
 *          submission, candidate profiles, and attempt history.
 *          Connects directly to Supabase PostgreSQL.
 *
 * Proxied via Vite: /api/verification → http://localhost:5003
 *
 * Routes:
 *   GET  /verification/test-lookup/:testCode      — load test config
 *   GET  /verification/my-attempts/:studentId     — check attempted tests
 *   POST /verification/submit-module-result       — save module scores
 *   GET  /verification/test-results/:testId       — company result view
 *   GET  /profile/:userId                         — fetch user profile
 *   POST /profile/create                          — create/update profile
 * ─────────────────────────────────────────────────────────────────────────
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const { Pool } = require('pg');

// ── Database connection ────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgresql://postgres.ukdiydoqhirukeqwlpld:RUDHRITHSANDY040505@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 600000,          // 10 min — don't close idle connections too fast
  connectionTimeoutMillis: 10000,     // 10 sec to establish a connection
  keepAlive: true,                    // send TCP keepalive packets — prevents silent drops
  keepAliveInitialDelayMillis: 10000, // start keepalive after 10 sec of inactivity
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// ── Express setup ─────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.DATA_SERVICE_PORT || 5003;

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev, logged
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'data-service', port: PORT }));

// ─────────────────────────────────────────────────────────────────────────
// 1. GET /verification/test-lookup/:testCode
//    Returns test configuration — modules enabled, mapping IDs, codes.
//    Used by: UserDashboard.jsx (test card click + search)
// ─────────────────────────────────────────────────────────────────────────
app.get('/verification/test-lookup/:testCode', async (req, res) => {
  const { testCode } = req.params;
  try {
    const query = `
      SELECT t.test_id, t.test_code, t.company_id, t.hr_id,
             t.aptitude_module, t.verbal_module, t.interview_module, t.coding_module,
             c.company_name,
             tm.id AS test_mapping_id,
             am.aptitude_code, am.no_of_questions, am.topics AS aptitude_topics,
             cm.problem_codes AS coding_problem_codes,
             vm.verbal_code,
             im.ai_interview_code, im.no_of_questions AS ai_no_of_questions
      FROM test_infos t
      LEFT JOIN companies c          ON t.company_id = c.uid
      LEFT JOIN test_mappings tm     ON tm.id = (SELECT MAX(id) FROM test_mappings WHERE test_id = t.test_id)
      LEFT JOIN aptitude_mappings am ON tm.id = am.test_mapping_id
      LEFT JOIN coding_mappings cm   ON tm.id = cm.test_mapping_id
      LEFT JOIN verbal_mappings vm   ON tm.id = vm.test_mapping_id
      LEFT JOIN ai_interview_mappings im ON tm.id = im.test_mapping_id
      WHERE LOWER(t.test_id) = LOWER($1) OR LOWER(t.test_code) = LOWER($1)
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [testCode.trim()]);
    if (!rows.length) return res.status(404).json({ detail: 'Test not found' });

    const r = rows[0];

    // Parse JSON fields that may be stored as strings
    const parseField = (val) => {
      if (val === null || val === undefined) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    return res.json({
      testId:          r.test_id,
      testCode:        r.test_code,
      companyId:       r.company_id ? String(r.company_id) : null,
      hrId:            r.hr_id      ? String(r.hr_id)      : null,
      companyName:     r.company_name || 'Company',
      aptitudeModule:  Boolean(r.aptitude_module),
      verbalModule:    Boolean(r.verbal_module),
      interviewModule: Boolean(r.interview_module),
      codingModule:    Boolean(r.coding_module),
      testMappingId:   r.test_mapping_id,
      aptitudeMapping: (r.aptitude_code || r.aptitude_module) ? {
        aptitudeCode:  r.aptitude_code || ('APT-' + r.test_code),
        noOfQuestions: r.no_of_questions || 15,
        topics:        (r.aptitude_topics && parseField(r.aptitude_topics).length > 0)
                       ? parseField(r.aptitude_topics)
                       : ["Quantitative Aptitude"],
      } : null,
      codingMapping: r.coding_problem_codes ? {
        problemCodes: parseField(r.coding_problem_codes),
      } : null,
      verbalMapping: r.verbal_code ? {
        verbalCode: r.verbal_code,
      } : null,
      aiInterviewMapping: (r.ai_interview_code || r.interview_module) ? {
        aiInterviewCode: r.ai_interview_code || ('AI-' + r.test_code),
        noOfQuestions: r.ai_no_of_questions || 15,
      } : null,
    });
  } catch (err) {
    console.error('[test-lookup] Error:', err.message);
    return res.status(500).json({ detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 2. GET /verification/my-attempts/:studentId
//    Returns test IDs/codes attempted by this student.
//    Used by: UserDashboard.jsx (lock completed test cards)
// ─────────────────────────────────────────────────────────────────────────
app.get('/verification/my-attempts/:studentId', async (req, res) => {
  const { studentId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT test_id, test_code FROM results WHERE student_id = $1',
      [parseInt(studentId, 10)]
    );
    return res.json(rows.map(r => ({ testId: r.test_id, testCode: r.test_code })));
  } catch (err) {
    console.error('[my-attempts] Error:', err.message);
    return res.status(500).json({ detail: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────
// 3. POST /verification/submit-module-result
//    Saves a module result (aptitude/coding/verbal/interview) to the DB.
//    Used by: testFlowUtils.js (called after each module completes)
// ─────────────────────────────────────────────────────────────────────────
app.post('/verification/submit-module-result', async (req, res) => {
  const { studentId, testCode, moduleType, moduleResult: r } = req.body;

  if (!studentId || !testCode || !moduleType || !r) {
    return res.status(400).json({ detail: 'Missing required fields: studentId, testCode, moduleType, moduleResult' });
  }

  const parsedStudentId = parseInt(studentId, 10);
  if (isNaN(parsedStudentId) || parsedStudentId <= 0) {
    return res.status(400).json({ detail: 'Invalid studentId format' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch test_id from test code or test ID
    const testRow = await client.query(
      `SELECT t.test_id, t.company_id, t.hr_id, tm.id AS test_mapping_id
       FROM test_infos t
       LEFT JOIN test_mappings tm ON tm.id = (SELECT MAX(id) FROM test_mappings WHERE test_id = t.test_id)
       WHERE LOWER(t.test_code) = LOWER($1) OR LOWER(t.test_id) = LOWER($1) LIMIT 1`,
      [testCode]
    );
    if (!testRow.rows.length) throw new Error(`Test not found for code: ${testCode}`);
    const test = testRow.rows[0];

    // 2. Find or create the base results row
    const existRow = await client.query(
      'SELECT id FROM results WHERE student_id = $1 AND test_id = $2 LIMIT 1',
      [parsedStudentId, test.test_id]
    );

    let resultBaseId;
    if (existRow.rows.length) {
      resultBaseId = existRow.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO results
           (student_id, test_id, test_code, company_id, hr_id, test_mapping_id,
            total_score, score_secured, created_at)
         VALUES ($1,$2,$3,$4,$5,$6, 0.0, 0.0, NOW() AT TIME ZONE 'utc')
         RETURNING id`,
        [studentId, test.test_id, testCode, test.company_id, test.hr_id, test.test_mapping_id]
      );
      resultBaseId = ins.rows[0].id;
    }

    // 3. Insert / update the module-specific table
    if (moduleType === 'aptitude') {
      const ex = await client.query(
        'SELECT "Id" FROM aptitude_results WHERE result_base_id = $1', [resultBaseId]
      );
      if (ex.rows.length) {
        await client.query(
          `UPDATE aptitude_results
           SET aptitude_code=$1, module_total_score=$2, module_score_secured=$3,
               questions=$4, user_answers=$5, correct_answers=$6,
               topics=$7, correct=$8, incorrect=$9
           WHERE result_base_id=$10`,
          [
            r.aptitudeCode || '', r.moduleTotalScore || 0, r.moduleScoreSecured || 0,
            JSON.stringify(r.questions || []), JSON.stringify(r.userAnswers || []),
            JSON.stringify(r.correctAnswers || []), JSON.stringify(r.topics || []),
            r.correct || 0, r.incorrect || 0, resultBaseId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO aptitude_results
             (result_base_id, aptitude_code, module_total_score, module_score_secured,
              questions, user_answers, correct_answers, topics, correct, incorrect)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            resultBaseId, r.aptitudeCode || '',
            r.moduleTotalScore || 0, r.moduleScoreSecured || 0,
            JSON.stringify(r.questions || []), JSON.stringify(r.userAnswers || []),
            JSON.stringify(r.correctAnswers || []), JSON.stringify(r.topics || []),
            r.correct || 0, r.incorrect || 0,
          ]
        );
      }
    } else if (moduleType === 'coding') {
      const ex = await client.query(
        'SELECT "Id" FROM coding_results WHERE result_base_id = $1', [resultBaseId]
      );
      if (ex.rows.length) {
        await client.query(
          `UPDATE coding_results
           SET coding_code=$1, module_total_score=$2, module_score_secured=$3,
               testcase_totals=$4, testcase_passed=$5, answers=$6
           WHERE result_base_id=$7`,
          [
            r.codingCode || '', r.moduleTotalScore || 0, r.moduleScoreSecured || 0,
            JSON.stringify(r.testcaseTotals || []), JSON.stringify(r.testcasePassed || []),
            JSON.stringify(r.answers || []), resultBaseId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO coding_results
             (result_base_id, coding_code, module_total_score, module_score_secured,
              testcase_totals, testcase_passed, answers)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            resultBaseId, r.codingCode || '',
            r.moduleTotalScore || 0, r.moduleScoreSecured || 0,
            JSON.stringify(r.testcaseTotals || []), JSON.stringify(r.testcasePassed || []),
            JSON.stringify(r.answers || []),
          ]
        );
      }
    } else if (moduleType === 'interview') {
      const ex = await client.query(
        'SELECT "Id" FROM ai_interview_results WHERE result_base_id = $1', [resultBaseId]
      );
      if (ex.rows.length) {
        await client.query(
          `UPDATE ai_interview_results
           SET ai_code=$1, module_total_score=$2, module_score_secured=$3,
               questions=$4, answers=$5, correct_answers=$6, correct=$7, wrong=$8
           WHERE result_base_id=$9`,
          [
            r.aiCode || '', r.moduleTotalScore || 0, r.moduleScoreSecured || 0,
            JSON.stringify(r.questions || []), JSON.stringify(r.answers || []),
            JSON.stringify(r.correctAnswers || []), r.correct || 0, r.wrong || 0,
            resultBaseId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO ai_interview_results
             (result_base_id, ai_code, module_total_score, module_score_secured,
              questions, answers, correct_answers, correct, wrong)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            resultBaseId, r.aiCode || '',
            r.moduleTotalScore || 0, r.moduleScoreSecured || 0,
            JSON.stringify(r.questions || []), JSON.stringify(r.answers || []),
            JSON.stringify(r.correctAnswers || []), r.correct || 0, r.wrong || 0,
          ]
        );
      }
    } else if (moduleType === 'verbal') {
      const speakingScore  = parseFloat(r.speakingScore  || 0);
      const listeningScore = parseFloat(r.listeningScore || 0);
      const totalScore     = parseFloat(r.moduleTotalScore || 20);
      const securedScore   = speakingScore + listeningScore;

      const metrics = {};
      const sp = r.speakingParameters  || {};
      const lp = r.listeningParameters || {};
      Object.entries(sp).forEach(([k, v]) => { metrics[`speaking_${k}`]  = parseFloat(v) || 0; });
      Object.entries(lp).forEach(([k, v]) => { metrics[`listening_${k}`] = parseFloat(v) || 0; });

      const speakingList  = sp ? [JSON.stringify(sp)]  : [];
      const listeningList = lp ? [JSON.stringify(lp)] : [];

      const ex = await client.query(
        'SELECT "Id" FROM verbal_results WHERE result_base_id = $1', [resultBaseId]
      );
      if (ex.rows.length) {
        await client.query(
          `UPDATE verbal_results
           SET verbal_code=$1, module_total_score=$2, module_score_secured=$3,
               metrics=$4, listening=$5, speaking=$6
           WHERE result_base_id=$7`,
          [
            r.verbalCode || '', totalScore, securedScore,
            JSON.stringify(metrics), JSON.stringify(listeningList),
            JSON.stringify(speakingList), resultBaseId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO verbal_results
             (result_base_id, verbal_code, module_total_score, module_score_secured,
              metrics, listening, speaking)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            resultBaseId, r.verbalCode || '', totalScore, securedScore,
            JSON.stringify(metrics), JSON.stringify(listeningList),
            JSON.stringify(speakingList),
          ]
        );
      }
    } else if (moduleType === 'start') {
      // Base results row created — attempt successfully registered
    } else {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ detail: `Unknown moduleType: ${moduleType}` });
    }

    // 4. Recalculate aggregate scores
    const [apt, cod, intv, vbl] = await Promise.all([
      client.query('SELECT module_total_score, module_score_secured FROM aptitude_results      WHERE result_base_id = $1', [resultBaseId]),
      client.query('SELECT module_total_score, module_score_secured FROM coding_results        WHERE result_base_id = $1', [resultBaseId]),
      client.query('SELECT module_total_score, module_score_secured FROM ai_interview_results  WHERE result_base_id = $1', [resultBaseId]),
      client.query('SELECT module_total_score, module_score_secured FROM verbal_results        WHERE result_base_id = $1', [resultBaseId]),
    ]);

    let totalScore = 0, scoreSecured = 0;
    for (const q of [apt, cod, intv, vbl]) {
      if (q.rows.length) {
        totalScore   += parseFloat(q.rows[0].module_total_score   || 0);
        scoreSecured += parseFloat(q.rows[0].module_score_secured || 0);
      }
    }

    await client.query(
      'UPDATE results SET total_score=$1, score_secured=$2 WHERE id=$3',
      [totalScore, scoreSecured, resultBaseId]
    );

    await client.query('COMMIT');
    return res.json({ status: 'success', resultBaseId, totalScore, scoreSecured });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[submit-module-result] Error:', err.message);
    return res.status(500).json({ detail: `Database submission failed: ${err.message}` });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 4. GET /verification/test-results/:testId
//    Returns all candidate results for a test (used by Company Dashboard).
// ─────────────────────────────────────────────────────────────────────────
app.get('/verification/test-results/:testId', async (req, res) => {
  const { testId } = req.params;
  if (!testId || typeof testId !== 'string' || testId.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid testId parameter' });
  }

  try {
    const sanitizedTestId = testId.trim();
    const { rows: results } = await pool.query(
      'SELECT id, student_id, test_id, test_code, total_score, score_secured, created_at FROM results WHERE LOWER(test_id) = LOWER($1)',
      [sanitizedTestId]
    );
    if (!results.length) return res.json([]);

    const safe = (val, fallback = null) => (val !== undefined && val !== null ? val : fallback);

    const output = await Promise.all(results.map(async (row) => {
      const resultBaseId = row.id;
      const studentId    = row.student_id;

      const [profileRow, apt, cod, intv, vbl] = await Promise.all([
        pool.query('SELECT full_name, email FROM user_profiles WHERE user_id = $1 LIMIT 1', [studentId]),
        pool.query('SELECT aptitude_code, module_total_score, module_score_secured, questions, user_answers, correct_answers, topics, correct, incorrect FROM aptitude_results     WHERE result_base_id = $1 LIMIT 1', [resultBaseId]),
        pool.query('SELECT coding_code, module_total_score, module_score_secured, testcase_totals, testcase_passed, answers FROM coding_results                                   WHERE result_base_id = $1 LIMIT 1', [resultBaseId]),
        pool.query('SELECT ai_code, module_total_score, module_score_secured, questions, answers, correct_answers, correct, wrong FROM ai_interview_results                      WHERE result_base_id = $1 LIMIT 1', [resultBaseId]),
        pool.query('SELECT verbal_code, module_total_score, module_score_secured, metrics, listening, speaking FROM verbal_results                                               WHERE result_base_id = $1 LIMIT 1', [resultBaseId]),
      ]);

      const profile = profileRow.rows[0];
      const a  = apt.rows[0],  c  = cod.rows[0];
      const iv = intv.rows[0], vb = vbl.rows[0];

      return {
        resultBaseId,
        studentId,
        studentName:  profile?.full_name  || `Candidate #${studentId}`,
        studentEmail: profile?.email      || '',
        testId:       row.test_id,
        testCode:     row.test_code,
        totalScore:   parseFloat(row.total_score   || 0),
        scoreSecured: parseFloat(row.score_secured || 0),
        createdAt:    row.created_at ? row.created_at.toISOString() : null,
        aptitude: a ? {
          aptitudeCode:       safe(a.aptitude_code, ''),
          moduleTotalScore:   parseFloat(a.module_total_score   || 0),
          moduleScoreSecured: parseFloat(a.module_score_secured || 0),
          questions:     safe(a.questions,      []),
          userAnswers:   safe(a.user_answers,   []),
          correctAnswers:safe(a.correct_answers,[]),
          topics:        safe(a.topics,         []),
          correct:       parseInt(a.correct   || 0, 10),
          incorrect:     parseInt(a.incorrect || 0, 10),
        } : null,
        coding: c ? {
          codingCode:         safe(c.coding_code, ''),
          moduleTotalScore:   parseFloat(c.module_total_score   || 0),
          moduleScoreSecured: parseFloat(c.module_score_secured || 0),
          testcaseTotals: safe(c.testcase_totals, []),
          testcasePassed: safe(c.testcase_passed, []),
          answers:        safe(c.answers,         []),
        } : null,
        aiInterview: iv ? {
          aiCode:             safe(iv.ai_code, ''),
          moduleTotalScore:   parseFloat(iv.module_total_score   || 0),
          moduleScoreSecured: parseFloat(iv.module_score_secured || 0),
          questions:      safe(iv.questions,       []),
          answers:        safe(iv.answers,         []),
          correctAnswers: safe(iv.correct_answers, []),
          correct: parseInt(iv.correct || 0, 10),
          wrong:   parseInt(iv.wrong   || 0, 10),
        } : null,
        verbal: vb ? {
          verbalCode:         safe(vb.verbal_code, ''),
          moduleTotalScore:   parseFloat(vb.module_total_score   || 0),
          moduleScoreSecured: parseFloat(vb.module_score_secured || 0),
          metrics:   safe(vb.metrics,   {}),
          listening: safe(vb.listening, []),
          speaking:  safe(vb.speaking,  []),
        } : null,
      };
    }));

    return res.json(output);
  } catch (err) {
    console.error('[test-results] Error:', err.message);
    return res.status(500).json({ detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 5. GET /profile/:userId
//    Returns the user profile row for a given userId.
//    Used by: TestDashboard.jsx (company view of candidate profile)
// ─────────────────────────────────────────────────────────────────────────
app.get('/profile/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1 LIMIT 1',
      [parseInt(userId, 10)]
    );
    if (!rows.length) return res.status(404).json({ detail: 'Profile not found' });

    // Return camelCase keys matching the Python response format
    const p = rows[0];
    return res.json({
      userId:   p.user_id,
      FullName: p.full_name,
      fullName: p.full_name,
      Email:    p.email,
      email:    p.email,
      Dob:      p.dob,     dob:     p.dob,
      Age:      p.age,     age:     p.age,
      College:  p.college, college: p.college,
      Address:  p.address, address: p.address,
      Phone:    p.phone,   phone:   p.phone,
      Gender:   p.gender,  gender:  p.gender,
      PhotoUrl: p.photo_url, photoUrl: p.photo_url,
    });
  } catch (err) {
    console.error('[profile-get] Error:', err.message);
    return res.status(500).json({ detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 6. POST /profile/create
//    Creates or updates a user profile record.
//    Used by: SubmitProfile.jsx
// ─────────────────────────────────────────────────────────────────────────
app.post('/profile/create', async (req, res) => {
  const { UserId, FullName, Email, Dob, Age, College, Address, Phone, Gender, PhotoUrl } = req.body;
  if (!UserId) return res.status(400).json({ detail: 'UserId is required' });

  try {
    // Upsert — update if exists, insert if not
    const { rows } = await pool.query(
      `INSERT INTO user_profiles (user_id, full_name, email, dob, age, college, address, phone, gender, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id)
       DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email     = EXCLUDED.email,
         dob       = EXCLUDED.dob,
         age       = EXCLUDED.age,
         college   = EXCLUDED.college,
         address   = EXCLUDED.address,
         phone     = EXCLUDED.phone,
         gender    = EXCLUDED.gender,
         photo_url = EXCLUDED.photo_url
       RETURNING user_id`,
      [UserId, FullName, Email, Dob || null, Age || null, College || null,
       Address || null, Phone || null, Gender || null, PhotoUrl || null]
    );
    return res.json({ message: 'Profile created/updated successfully', userId: rows[0].user_id });
  } catch (err) {
    console.error('[profile-create] Error:', err.message);
    return res.status(500).json({ detail: err.message });
  }
});

// ── Start server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Intervista Data Service] Running on http://localhost:${PORT}`);
  console.log(`[Intervista Data Service] Connected to Supabase PostgreSQL`);
  console.log(`[Intervista Data Service] Routes: test-lookup | my-attempts | submit-module-result | test-results | profile`);
});
