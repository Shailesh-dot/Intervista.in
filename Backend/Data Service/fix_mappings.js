const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres.ukdiydoqhirukeqwlpld:RUDHRITHSANDY040505@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    const tests = await p.query("SELECT test_id, test_code, company_id, hr_id, aptitude_module FROM test_infos WHERE aptitude_module = true");
    console.log(`Found ${tests.rows.length} tests with aptitude_module=true`);

    for (const t of tests.rows) {
      // Check if test_mapping exists
      const existing = await p.query('SELECT id FROM test_mappings WHERE test_id = $1', [t.test_id]);
      let tmId;

      if (existing.rows.length === 0) {
        const ins = await p.query(
          'INSERT INTO test_mappings(test_id, test_code, company_id, hr_id) VALUES($1, $2, $3, $4) RETURNING id',
          [t.test_id, t.test_code, t.company_id, t.hr_id]
        );
        tmId = ins.rows[0].id;
        console.log(`  Created test_mapping for ${t.test_id}, id=${tmId}`);
      } else {
        tmId = existing.rows[0].id;
        console.log(`  test_mapping already exists for ${t.test_id}, id=${tmId}`);
      }

      // Check if aptitude_mapping exists
      const amExist = await p.query('SELECT id FROM aptitude_mappings WHERE test_mapping_id = $1', [tmId]);

      if (amExist.rows.length === 0) {
        const topicsJson = JSON.stringify(["Quantitative Aptitude"]);
        await p.query(
          'INSERT INTO aptitude_mappings(test_mapping_id, aptitude_code, no_of_questions, topics) VALUES($1, $2, 15, $3)',
          [tmId, 'APT-' + t.test_code, topicsJson]
        );
        console.log(`  Created aptitude_mapping for ${t.test_id} with topics: ["Quantitative Aptitude"]`);
      } else {
        console.log(`  aptitude_mapping already exists for ${t.test_id}`);
      }
    }

    console.log('\nDONE - All existing tests fixed!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    p.end();
  }
}

fix();
