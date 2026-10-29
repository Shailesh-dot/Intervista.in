import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows console
sys.stdout.reconfigure(encoding='utf-8')

# =================================================================
# PATHS & CONFIGURATION
# =================================================================
ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / ".env"
load_dotenv(ENV_PATH)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ukdiydoqhirukeqwlpld.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

TOPICS_PATH = ROOT / "data" / "topics_mapping.json"
QUESTIONS_PATH = ROOT / "data" / "all_questions.json"


# =================================================================
# POSTGRES DIRECT INGESTION (Fast, Reliable & Incremental)
# =================================================================
def migrate_via_postgres(database_url, questions, topic_map):
    import psycopg2
    from psycopg2.extras import execute_values

    print("[*] Connecting to PostgreSQL database...", flush=True)
    conn = psycopg2.connect(database_url)
    conn.autocommit = False

    # Ensure unique constraint on aptitude_questions
    with conn.cursor() as cur:
        cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS aptitude_questions_question_key ON aptitude_questions (question);")
        conn.commit()

    # Find which questions already exist to do fast incremental insert
    with conn.cursor() as cur:
        cur.execute("SELECT question FROM aptitude_questions;")
        existing_questions = set(row[0] for row in cur.fetchall())

    new_questions = [q for q in questions if (q.get("question") or "").strip() not in existing_questions]
    print(f"[*] Total in JSON: {len(questions)} | Already in DB: {len(existing_questions)} | New to insert: {len(new_questions)}", flush=True)

    master_rows = []
    topic_batches = {}

    target_list = new_questions if len(new_questions) > 0 else questions

    for q in target_list:
        q_text = (q.get("question") or "").strip()
        if not q_text:
            continue
        
        opts = q.get("options", {})
        opts_str = json.dumps(opts) if isinstance(opts, (dict, list)) else str(opts or "{}")

        row = (
            q_text,
            opts_str,
            q.get("answer"),
            q.get("explanation"),
            q.get("category"),
            q.get("source")
        )
        master_rows.append(row)

        cat = q.get("category")
        table_name = topic_map.get(cat)
        if not table_name and q.get("source"):
            src_clean = Path(q.get("source")).stem
            table_name = topic_map.get(src_clean)

        if table_name:
            if table_name not in topic_batches:
                topic_batches[table_name] = []
            topic_batches[table_name].append(row)

    # 1. Insert to master table `aptitude_questions`
    master_inserted = 0
    if master_rows:
        print(f"[*] Inserting {len(master_rows)} rows into master table 'aptitude_questions'...", flush=True)
        with conn.cursor() as cur:
            query = """
                INSERT INTO aptitude_questions (question, options, correct_answer, explanation, category, source)
                VALUES %s
                ON CONFLICT (question) DO UPDATE SET
                    options = EXCLUDED.options,
                    correct_answer = EXCLUDED.correct_answer,
                    explanation = EXCLUDED.explanation,
                    category = EXCLUDED.category,
                    source = EXCLUDED.source
            """
            execute_values(cur, query, master_rows, page_size=200)
            master_inserted = len(master_rows)
            conn.commit()
        print(f"  [OK] Master 'aptitude_questions' synced: {master_inserted} rows", flush=True)
    else:
        print("  [OK] Master 'aptitude_questions' already up-to-date.", flush=True)

    # 2. Insert into individual topic tables
    topic_total = 0
    for table_name, rows in topic_batches.items():
        try:
            with conn.cursor() as cur:
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS {table_name} (
                        id SERIAL PRIMARY KEY,
                        question TEXT UNIQUE,
                        options TEXT,
                        correct_answer VARCHAR(10),
                        explanation TEXT,
                        category VARCHAR(200),
                        source VARCHAR(200)
                    );
                    CREATE UNIQUE INDEX IF NOT EXISTS {table_name}_question_key ON {table_name} (question);
                """)
                conn.commit()

                query = f"""
                    INSERT INTO {table_name} (question, options, correct_answer, explanation, category, source)
                    VALUES %s
                    ON CONFLICT (question) DO UPDATE SET
                        options = EXCLUDED.options,
                        correct_answer = EXCLUDED.correct_answer,
                        explanation = EXCLUDED.explanation,
                        category = EXCLUDED.category,
                        source = EXCLUDED.source
                """
                execute_values(cur, query, rows, page_size=200)
                conn.commit()
                topic_total += len(rows)
                print(f"  [OK] Topic table '{table_name}' synced: {len(rows)} rows", flush=True)
        except Exception as e:
            conn.rollback()
            print(f"  [WARN] Failed to insert to topic table '{table_name}': {e}", flush=True)

    conn.close()
    return master_inserted, topic_total


# =================================================================
# REST API FALLBACK
# =================================================================
def migrate_via_rest(questions, topic_map):
    import urllib.request
    import urllib.error

    print(f"[*] Connecting via Supabase REST API to {SUPABASE_URL}...", flush=True)
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    def insert_batch_rest(table_name, rows_batch):
        if not rows_batch:
            return 0
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?on_conflict=question"
        data = json.dumps(rows_batch).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        try:
            urllib.request.urlopen(req)
            return len(rows_batch)
        except Exception as e:
            print(f"  [ERROR] REST insert to '{table_name}' failed: {e}", flush=True)
            return 0

    BATCH_SIZE = 100
    total_master = 0
    total_topic = 0

    for i in range(0, len(questions), BATCH_SIZE):
        batch = questions[i:i+BATCH_SIZE]
        master_rows = []
        topic_batches = {}

        for q in batch:
            row = {
                "question": q.get("question"),
                "options": json.dumps(q.get("options", {})),
                "correct_answer": q.get("answer"),
                "explanation": q.get("explanation"),
                "category": q.get("category"),
                "source": q.get("source")
            }
            master_rows.append(row)
            cat = q.get("category")
            if cat in topic_map:
                table_name = topic_map[cat]
                if table_name not in topic_batches:
                    topic_batches[table_name] = []
                topic_batches[table_name].append(row)

        total_master += insert_batch_rest("aptitude_questions", master_rows)
        for tbl, trows in topic_batches.items():
            total_topic += insert_batch_rest(tbl, trows)

    return total_master, total_topic


# =================================================================
# MAIN ENTRY
# =================================================================
def run_migration():
    print("==============================================", flush=True)
    print("  Supabase Data Migration", flush=True)
    print("==============================================\n", flush=True)

    if not QUESTIONS_PATH.exists():
        print(f"[ERROR] Questions file not found at: {QUESTIONS_PATH}", flush=True)
        return

    with open(TOPICS_PATH, "r", encoding="utf-8") as f:
        topic_map = json.load(f)

    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        questions = json.load(f)

    print(f"[*] Loaded {len(questions)} questions from {QUESTIONS_PATH.name}", flush=True)

    if DATABASE_URL:
        try:
            master_cnt, topic_cnt = migrate_via_postgres(DATABASE_URL, questions, topic_map)
        except Exception as e:
            print(f"\n[WARN] Direct PostgreSQL failed: {e}. Falling back to REST API...", flush=True)
            master_cnt, topic_cnt = migrate_via_rest(questions, topic_map)
    else:
        master_cnt, topic_cnt = migrate_via_rest(questions, topic_map)

    print("\n==============================================", flush=True)
    print("  MIGRATION COMPLETE", flush=True)
    print("==============================================", flush=True)
    print(f"  Master 'aptitude_questions': {master_cnt} questions synced", flush=True)
    print(f"  Topic tables:                {topic_cnt} questions synced", flush=True)
    print("==============================================\n", flush=True)


if __name__ == "__main__":
    run_migration()
