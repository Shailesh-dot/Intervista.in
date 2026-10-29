const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.ukdiydoqhirukeqwlpld:RUDHRITHSANDY040505@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query("SELECT * FROM results WHERE LOWER(test_id) = 'test-24' OR LOWER(test_code) = '097b0f' ORDER BY id DESC LIMIT 5");
    console.log('--- RESULTS TABLE ---');
    console.log(JSON.stringify(res.rows, null, 2));

    const ires = await pool.query("SELECT * FROM interview_results ORDER BY id DESC LIMIT 2");
    console.log('--- INTERVIEW_RESULTS ---');
    console.log(JSON.stringify(ires.rows, null, 2));

    const isess = await pool.query("SELECT * FROM interview_sessions WHERE id = '610be2f3-d35c-4169-9ebe-82ea8d6a7159'");
    console.log('--- INTERVIEW_SESSION ---');
    console.log(JSON.stringify(isess.rows, null, 2));

    const spk = await pool.query("SELECT * FROM speaking_sessions ORDER BY created_at DESC LIMIT 2");
    console.log('--- SPEAKING_SESSIONS ---');
    console.log(JSON.stringify(spk.rows, null, 2));

    const list = await pool.query("SELECT * FROM listening_sessions ORDER BY created_at DESC LIMIT 2");
    console.log('--- LISTENING_SESSIONS ---');
    console.log(JSON.stringify(list.rows, null, 2));

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

main();
