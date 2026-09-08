-- =============================================================================
-- INTERVISTA CYBERSECURITY AUDIT BASELINE — DATABASE AUDIT SQL
-- Target: PostgreSQL / Supabase
-- =============================================================================

-- 1. Database Version
SELECT version();
SHOW server_version;

-- 2. Table Inventory
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog','information_schema') 
ORDER BY table_schema, table_name;

-- 3. Column Inventory & Sensitive Fields
SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema NOT IN ('pg_catalog','information_schema') 
ORDER BY table_schema, table_name, ordinal_position;

-- 4. Foreign Key Constraints & Relationships
SELECT 
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_schema, tc.table_name;

-- 5. Tables without Primary Key (Security / Integrity Risk)
SELECT t.table_name
FROM information_schema.tables t
LEFT JOIN (
  SELECT tc.table_name
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
) pk ON t.table_name = pk.table_name
WHERE t.table_schema = 'public' AND pk.table_name IS NULL;

-- 6. Unique Constraints
SELECT tc.table_name, kcu.column_name, tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 7. Indexes
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname NOT IN ('pg_catalog','information_schema')
ORDER BY schemaname, tablename;

-- 8. Row Level Security (RLS) Status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 9. Row Level Security Policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- 10. Role Table Grants / Privileges
SELECT grantee, table_schema, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
ORDER BY table_name, grantee;

-- 11. Sensitive Columns Identification
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND (LOWER(column_name) LIKE '%password%' 
    OR LOWER(column_name) LIKE '%secret%' 
    OR LOWER(column_name) LIKE '%token%' 
    OR LOWER(column_name) LIKE '%apikey%' 
    OR LOWER(column_name) LIKE '%api_key%')
ORDER BY table_name, column_name;

-- 12. Constraints Inventory (PK, FK, UNIQUE, CHECK)
SELECT table_name, constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
ORDER BY table_name, constraint_type;

-- 13. Stored Functions and Procedures
SELECT routine_schema, routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema NOT IN ('pg_catalog','information_schema')
ORDER BY routine_schema, routine_name;

-- 14. Data Integrity Checks (Intervista Real Schema)
SELECT email, COUNT(*) FROM "Users" GROUP BY email HAVING COUNT(*) > 1;
SELECT email, COUNT(*) FROM "Company" GROUP BY email HAVING COUNT(*) > 1;
SELECT email, COUNT(*) FROM "Hr" GROUP BY email HAVING COUNT(*) > 1;
