const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.ukdiydoqhirukeqwlpld:RUDHRITHSANDY040505@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function runAudit() {
  const audit = {};
  
  // 1. Version
  const v = await pool.query('SELECT version()');
  audit.version = v.rows[0].version;

  // 2. Tables
  const t = await pool.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('pg_catalog','information_schema') 
    ORDER BY table_schema, table_name;
  `);
  audit.tables = t.rows;

  // 3. RLS Status
  const rls = await pool.query(`
    SELECT schemaname, tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename;
  `);
  audit.rls_status = rls.rows;

  // 4. RLS Policies
  const pol = await pool.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename, policyname;
  `);
  audit.rls_policies = pol.rows;

  // 5. Sensitive columns
  const sens = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND (LOWER(column_name) LIKE '%password%' 
        OR LOWER(column_name) LIKE '%secret%' 
        OR LOWER(column_name) LIKE '%token%' 
        OR LOWER(column_name) LIKE '%apikey%' 
        OR LOWER(column_name) LIKE '%api_key%')
    ORDER BY table_name, column_name;
  `);
  audit.sensitive_columns = sens.rows;

  // 6. Tables without Primary Key
  const noPk = await pool.query(`
    SELECT t.table_name
    FROM information_schema.tables t
    LEFT JOIN (
      SELECT tc.table_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
    ) pk ON t.table_name = pk.table_name
    WHERE t.table_schema = 'public' AND pk.table_name IS NULL;
  `);
  audit.tables_without_pk = noPk.rows.map(r => r.table_name);

  // 7. Role Table Grants
  const grants = await pool.query(`
    SELECT grantee, table_name, privilege_type 
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' 
    ORDER BY table_name, grantee;
  `);
  audit.table_grants = grants.rows;

  // 8. Constraints
  const constr = await pool.query(`
    SELECT table_name, constraint_name, constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
    ORDER BY table_name, constraint_type;
  `);
  audit.constraints = constr.rows;

  // 9. Stored Functions
  const funcs = await pool.query(`
    SELECT routine_schema, routine_name, routine_type 
    FROM information_schema.routines 
    WHERE routine_schema NOT IN ('pg_catalog','information_schema')
    ORDER BY routine_schema, routine_name;
  `);
  audit.stored_functions = funcs.rows;

  // 10. Data integrity / Conflict checks
  audit.integrity_checks = {};

  try {
    const dupUsers = await pool.query('SELECT email, count(*) FROM "Users" GROUP BY email HAVING count(*) > 1;');
    audit.integrity_checks.duplicate_user_emails = dupUsers.rows;
  } catch (e) {
    audit.integrity_checks.duplicate_user_emails_note = e.message;
  }

  try {
    const dupCompany = await pool.query('SELECT email, count(*) FROM "Company" GROUP BY email HAVING count(*) > 1;');
    audit.integrity_checks.duplicate_company_emails = dupCompany.rows;
  } catch (e) {
    audit.integrity_checks.duplicate_company_emails_note = e.message;
  }

  fs.writeFileSync('security/reports/database-audit.json', JSON.stringify(audit, null, 2), 'utf-8');
  console.log('Database audit successful! Audited ' + t.rows.length + ' tables.');
  await pool.end();
}

runAudit().catch(err => {
  console.error('Audit query error:', err.message);
  process.exit(1);
});
