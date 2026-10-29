import os
from db import supabase_request
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pathlib import Path
import json
import random

STATIC_DIR = Path(__file__).parent / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
CORS(app)

MAP_PATH = Path(__file__).parent / "data" / "topics_mapping.json"
try:
    with open(MAP_PATH, "r", encoding="utf-8") as f:
        TOPIC_MAP = json.load(f)
except Exception as e:
    print(f"[WARN] Could not load topics_mapping.json: {e}")
    TOPIC_MAP = {}

def ensure_tables():
    pass

def load_json_to_db(reset=False):
    import subprocess
    import sys
    print("\n[SYNC] Checking for new question files and converting to JSON...")
    convert_path = Path(__file__).parent / "scripts" / "convert.py"
    try:
        subprocess.run([sys.executable, str(convert_path)], check=True)
    except Exception as e:
        print(f"[WARN] Failed to run convert.py (is Tesseract/pdfplumber missing?): {e}")

    print("\n[SYNC] Syncing local JSON to Supabase Cloud...")
    migrate_path = Path(__file__).parent / "migrate.py"
    try:
        subprocess.run([sys.executable, str(migrate_path)])
    except Exception as e:
        print(f"[ERROR] Failed to run migrate.py: {e}")

@app.route("/api/topics")
def get_topics():
    topic_details = []
    for topic_name, table_name in TOPIC_MAP.items():
        try:
            count = supabase_request("GET", table_name, prefer="count=exact,head=true") or 0
        except Exception:
            count = 0
            
        display = topic_name.replace("_", " ")
        for prefix in ["Topic ", "Q"]:
            if display.startswith(prefix):
                display = display[len(prefix):]
        parts = display.split(" ", 1)
        if parts[0].isdigit() and len(parts) > 1:
            display = parts[1]
            
        topic_details.append({
            "key": topic_name,
            "table": table_name,
            "display": display.strip(),
            "count": count
        })

    topic_details.sort(key=lambda t: t["display"].lower())
    return jsonify({
        "topics": topic_details,
        "count": len(topic_details)
    })

CATEGORY_TOPICS = {
    "Quantitative Aptitude": [
        "11_Number_System",
        "12_HCF_LCM",
        "13_Percentages",
        "Topic_14_Ratio_Proportion",
        "Topic_15_Profit_Loss_Discounts",
        "Topic_16_Averages",
        "Topic_17_Time_and_Work_Pipes_Cisterns",
        "03_Probability",
        "04_Permutation_Combination"
    ],
    "Logical Reasoning": [
        "Topic_01_Direction_Sense",
        "Topic_02_Coding_Decoding",
        "Topic_03_Number_Series",
        "Topic_04_Blood_Relations",
        "Topic_05_Order_Ranking",
        "Topic_06_Syllogism",
        "Topic_08_Inequalities",
        "10_Logical_Puzzles",
        "Q30_Calendar_Clock",
        "topic22_mirror_image",
        "topic23_water_image",
        "topic24_shadow_light",
        "Q25_Missing_Figure_Image_Completion",
        "Q26_Figure_Series_Pattern_Shapes",
        "Q27_Paper_Folding_Cutting",
        "Q28_Cube_Dice_Problems",
        "Q29_Embedded_Figures",
        "topic25_missing_figure"
    ],
    "Data Interpretation": [
        "02_Data_Interpretation",
        "09_Data_Sufficiency"
    ],
    "Verbal Ability": [
        "sandy.md",
        "14.md",
        "Q31_TSP",
        "Java_MCQs",
        "TSP - IV"
    ]
}

APTITUDE_HIERARCHY = {
    "Quantitative Aptitude": {
        "description": "Numerical calculations, mathematical logic, and quantitative problem-solving",
        "subtopics": [
            {"key": "Topic_16_Averages", "name": "Averages", "count": 100},
            {"key": "13_Percentages", "name": "Percentages", "count": 100},
            {"key": "Topic_15_Profit_Loss_Discounts", "name": "Profit, Loss & Discounts", "count": 100},
            {"key": "Topic_14_Ratio_Proportion", "name": "Ratio & Proportion", "count": 89},
            {"key": "Topic_17_Time_and_Work_Pipes_Cisterns", "name": "Time & Work, Pipes & Cisterns", "count": 100},
            {"key": "11_Number_System", "name": "Number System", "count": 100},
            {"key": "12_HCF_LCM", "name": "HCF & LCM", "count": 100},
            {"key": "03_Probability", "name": "Probability", "count": 95},
            {"key": "04_Permutation_Combination", "name": "Permutation & Combination", "count": 100},
        ]
    },
    "Logical Reasoning": {
        "description": "Deductive reasoning, pattern recognition, and logical relationships",
        "subtopics": [
            {"key": "Topic_04_Blood_Relations", "name": "Blood Relations", "count": 100},
            {"key": "Topic_02_Coding_Decoding", "name": "Coding & Decoding", "count": 100},
            {"key": "Topic_01_Direction_Sense", "name": "Direction Sense", "count": 100},
            {"key": "Topic_03_Number_Series", "name": "Number Series", "count": 100},
            {"key": "Topic_05_Order_Ranking", "name": "Order & Ranking", "count": 100},
            {"key": "Topic_06_Syllogism", "name": "Syllogism", "count": 100},
            {"key": "Topic_08_Inequalities", "name": "Inequalities", "count": 100},
            {"key": "10_Logical_Puzzles", "name": "Logical Puzzles", "count": 93},
            {"key": "Q30_Calendar_Clock", "name": "Calendar & Clock", "count": 100},
            {"key": "Q28_Cube_Dice_Problems", "name": "Cube & Dice Problems", "count": 100},
            {"key": "Q27_Paper_Folding_Cutting", "name": "Paper Folding & Cutting", "count": 100},
            {"key": "Q29_Embedded_Figures", "name": "Embedded Figures", "count": 100},
            {"key": "Q25_Missing_Figure_Image_Completion", "name": "Missing Figure & Completion", "count": 100},
            {"key": "Q26_Figure_Series_Pattern_Shapes", "name": "Figure Series & Shapes", "count": 100},
            {"key": "topic22_mirror_image", "name": "Mirror Image", "count": 100},
            {"key": "topic23_water_image", "name": "Water Image", "count": 100},
            {"key": "topic24_shadow_light", "name": "Shadow & Light", "count": 103},
        ]
    },
    "Data Interpretation": {
        "description": "Data analysis from charts, tables, and data sufficiency",
        "subtopics": [
            {"key": "02_Data_Interpretation", "name": "Data Interpretation (Tables & Graphs)", "count": 100},
            {"key": "09_Data_Sufficiency", "name": "Data Sufficiency", "count": 100},
        ]
    },
    "Verbal Ability": {
        "description": "Grammar, sentence completion, and verbal comprehension",
        "subtopics": [
            {"key": "sandy.md", "name": "Verbal Reasoning & Comprehension", "count": 100},
            {"key": "Q31_TSP", "name": "Java MCQs & TSP", "count": 30},
        ]
    }
}

@app.route("/api/topics/hierarchy", methods=["GET"])
@app.route("/api/categories-and-subtopics", methods=["GET"])
def get_topics_hierarchy():
    return jsonify({
        "categories": APTITUDE_HIERARCHY,
        "total_questions": len(LOCAL_QUESTIONS_BANK)
    })

LOCAL_JSON_PATH = Path(__file__).parent / "data" / "all_questions.json"
LOCAL_QUESTIONS_BANK = []
try:
    if LOCAL_JSON_PATH.exists():
        with open(LOCAL_JSON_PATH, "r", encoding="utf-8") as f:
            LOCAL_QUESTIONS_BANK = json.load(f)
            for idx, item in enumerate(LOCAL_QUESTIONS_BANK, start=1):
                if "id" not in item or item["id"] is None:
                    item["id"] = idx
        print(f"[OK] Loaded {len(LOCAL_QUESTIONS_BANK)} local fallback questions.")
except Exception as err:
    print(f"[WARN] Failed to load local all_questions.json: {err}")


def _filter_local_questions(expanded_subtopics):
    if not expanded_subtopics:
        return LOCAL_QUESTIONS_BANK
    matching = []
    for q in LOCAL_QUESTIONS_BANK:
        src = (q.get("source") or "").lower()
        cat = (q.get("category") or "").lower()
        for topic_key in expanded_subtopics:
            tk_lower = topic_key.lower()
            if tk_lower in src or tk_lower in cat:
                matching.append(q)
                break
    return matching


@app.route("/api/questions/by-topics", methods=["POST"])
def get_questions_by_topics():
    payload = request.get_json(silent=True) or {}
    print(f"\n[DEBUG API] Received by-topics request. Payload: {payload}", flush=True)
    selected_topics = payload.get("topics", [])
    num_questions = payload.get("num_questions", 15)

    if isinstance(selected_topics, str):
        try:
            parsed = json.loads(selected_topics)
            if isinstance(parsed, list):
                selected_topics = parsed
            else:
                selected_topics = [selected_topics]
        except Exception:
            selected_topics = [selected_topics]

    expanded_subtopics = set()
    is_mixed = False

    for item in selected_topics:
        if not item or not isinstance(item, str):
            continue
        
        item_str = item.strip()

        if "mixed" in item_str.lower() or item_str.lower() == "all":
            is_mixed = True
            break

        # 1. Check if the item matches a main category name exactly
        matched_cat = False
        for cat_name, sub_list in CATEGORY_TOPICS.items():
            if cat_name.lower() == item_str.lower() or (len(item_str) > 6 and cat_name.lower() in item_str.lower()):
                expanded_subtopics.update(sub_list)
                matched_cat = True
                break

        if not matched_cat:
            # 2. Check if it matches a specific subtopic key or friendly name from APTITUDE_HIERARCHY
            found_sub = False
            for cat_data in APTITUDE_HIERARCHY.values():
                for sub in cat_data["subtopics"]:
                    if sub["key"].lower() == item_str.lower() or sub["name"].lower() == item_str.lower():
                        expanded_subtopics.add(sub["key"])
                        found_sub = True
                        break
                if found_sub:
                    break

            if not found_sub:
                if item_str in TOPIC_MAP:
                    expanded_subtopics.add(item_str)
                else:
                    for k in TOPIC_MAP.keys():
                        if item_str.lower() in k.lower() or k.lower() in item_str.lower():
                            expanded_subtopics.add(k)

    all_questions = []
    try:
        if is_mixed or not expanded_subtopics:
            # Mixed or no topic selected: use all questions from Supabase or local
            data = supabase_request("GET", "aptitude_questions", params={"select": "id,question,options,category,source", "limit": "500"})
            if data:
                all_questions.extend(data)
            else:
                all_questions = list(LOCAL_QUESTIONS_BANK)
        else:
            # Topic-specific: merge local JSON + Supabase topic tables
            # 1. Fetch from local JSON bank
            local_qs = _filter_local_questions(expanded_subtopics)
            all_questions.extend(local_qs)

            # 2. Also fetch from Supabase topic tables for topics that have a mapping
            seen_questions = set(q.get("question", "").strip().lower() for q in all_questions)
            for topic_key in expanded_subtopics:
                table_name = TOPIC_MAP.get(topic_key)
                if not table_name:
                    # Try fuzzy match in TOPIC_MAP
                    for k, v in TOPIC_MAP.items():
                        if topic_key.lower() in k.lower() or k.lower() in topic_key.lower():
                            table_name = v
                            break
                if table_name:
                    try:
                        supabase_qs = supabase_request(
                            "GET", table_name,
                            params={"select": "id,question,options,correct_answer,explanation,category,source", "limit": "200"}
                        )
                        if supabase_qs:
                            for sq in supabase_qs:
                                q_text = (sq.get("question") or "").strip().lower()
                                if q_text and q_text not in seen_questions:
                                    # Normalize field names (correct_answer -> answer)
                                    sq["answer"] = sq.get("correct_answer") or sq.get("answer")
                                    all_questions.append(sq)
                                    seen_questions.add(q_text)
                            print(f"  [SUPABASE] Fetched {len(supabase_qs)} from '{table_name}'", flush=True)
                    except Exception as se:
                        print(f"  [WARN] Supabase fetch for '{table_name}' failed: {se}", flush=True)

            print(f"[TOPIC FILTER] Requested topics: {selected_topics} -> expanded to {len(expanded_subtopics)} subtopics -> {len(all_questions)} total questions", flush=True)

        if len(all_questions) > num_questions:
            all_questions = random.sample(all_questions, num_questions)

        print(f"[DEBUG API] Returning {len(all_questions)} questions:", flush=True)
        for idx, q in enumerate(all_questions, 1):
            print(f"  {idx}. ID: {q.get('id')} | Source: {q.get('source')} | Category: {q.get('category')}", flush=True)

    except Exception as e:
        print("[WARN] get_questions_by_topics error, using local fallback:", e, flush=True)
        all_questions = _filter_local_questions(expanded_subtopics)
        if len(all_questions) > num_questions:
            all_questions = random.sample(all_questions, num_questions)

    out = []
    for r in all_questions:
        q = (r.get("question") or "").replace("**", "").replace("*", "").strip()
        opts = r.get("options")
        if isinstance(opts, str):
            try:
                opts = json.loads(opts)
            except:
                opts = {}
        out.append({
            "id": r.get("id"),
            "question": q,
            "options": opts,
            "category": r.get("category") or "General",
            "source": r.get("source") or "",
            "correct_answer": r.get("correct_answer") or r.get("answer") or "",
        })
    return jsonify(out)

@app.route("/api/questions")
def get_questions():
    try:
        data = supabase_request("GET", "aptitude_questions", params={"select": "id,question,options,category,source", "limit": "300"})
        if not data:
            data = LOCAL_QUESTIONS_BANK
        
        sample = random.sample(data, min(15, len(data)))
        out = []
        for r in sample:
            q = (r.get("question") or "").replace("**", "").replace("*", "").strip()
            opts = r.get("options")
            if isinstance(opts, str):
                try:
                    opts = json.loads(opts)
                except:
                    opts = {}
            out.append({
                "id": r.get("id"),
                "question": q,
                "options": opts,
                "category": r.get("category") or "General",
                "source": r.get("source") or "",
            })
        return jsonify(out)
    except Exception as e:
        print("[WARN] get_questions fallback to local:", e)
        sample = random.sample(LOCAL_QUESTIONS_BANK, min(15, len(LOCAL_QUESTIONS_BANK)))
        out = []
        for r in sample:
            q = (r.get("question") or "").replace("**", "").replace("*", "").strip()
            opts = r.get("options")
            if isinstance(opts, str):
                try:
                    opts = json.loads(opts)
                except:
                    opts = {}
            out.append({
                "id": r.get("id"),
                "question": q,
                "options": opts,
                "category": r.get("category") or "General",
                "source": r.get("source") or "",
            })
        return jsonify(out)

@app.route("/api/save", methods=["POST"])
def save():
    payload = request.get_json(silent=True)
    if not payload or "answers" not in payload:
        return jsonify({"error": "Invalid payload"}), 400

    answers = payload["answers"]
    correct = wrong = skipped = 0
    answer_rows = []

    try:
        for item in answers:
            qid = item.get("question_id")
            user_ans = item.get("answer")

            if qid is None:
                skipped += 1
                answer_rows.append({"question_id": None, "user_answer": user_ans, "correct_answer": None, "is_correct": None, "question_text": None})
                continue

            row = supabase_request("GET", "aptitude_questions", params={"id": f"eq.{qid}", "select": "correct_answer,question"})
            if not row:
                skipped += 1
                continue
                
            correct_ans = row[0].get("correct_answer")
            question_txt = row[0].get("question")

            if user_ans is None:
                skipped += 1
                is_correct = None
            elif str(user_ans).strip().upper() == str(correct_ans).strip().upper():
                correct += 1
                is_correct = True
            else:
                wrong += 1
                is_correct = False

            answer_rows.append({
                "question_id": qid,
                "question_text": question_txt,
                "user_answer": user_ans,
                "correct_answer": correct_ans,
                "is_correct": is_correct
            })

        total = len(answers)
        percentage = round(correct / total * 100, 2) if total else 0.0

        # Insert into Supabase quiz_results
        res = supabase_request(
            "POST", 
            "quiz_results", 
            json_data={
                "correct": correct, "wrong": wrong, "skipped": skipped, 
                "score": correct, "percentage": percentage
            },
            prefer="return=representation"
        )
        if not res:
            raise Exception("Failed to insert result to Supabase")
        result_id = res[0]["id"]

        for ar in answer_rows:
            ar["result_id"] = result_id
            
        if answer_rows:
            supabase_request("POST", "quiz_answers", json_data=answer_rows)

        print(f"[OK] result_id={result_id} | correct={correct} wrong={wrong} percentage={percentage}% Saved to Supabase Cloud.")
        return jsonify({"status": "saved", "result_id": result_id})

    except Exception as e:
        print("[ERROR] Save error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/debug")
def debug():
    try:
        q = supabase_request("GET", "aptitude_questions", prefer="count=exact,head=true") or 0
        r = supabase_request("GET", "quiz_results", prefer="count=exact,head=true") or 0
        a = supabase_request("GET", "quiz_answers", prefer="count=exact,head=true") or 0
        return jsonify({"aptitude_questions": q, "quiz_results": r, "quiz_answers": a})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/results")
def results():
    try:
        rows = supabase_request("GET", "quiz_results", params={"order": "submitted_at.desc", "limit": "50"}) or []
        out = []
        for r in rows:
            out.append({
                "id": r.get("id"),
                "correct": r.get("correct"),
                "wrong": r.get("wrong"),
                "skipped": r.get("skipped"),
                "score": r.get("score"),
                "percentage": float(r.get("percentage", 0)),
                "submitted_at": r.get("submitted_at")
            })
        return jsonify(out)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/results/<int:result_id>/answers")
def result_answers(result_id):
    try:
        rows = supabase_request("GET", "quiz_answers", params={"result_id": f"eq.{result_id}", "order": "id.asc"}) or []
        out = []
        for r in rows:
            out.append({
                "question_id": r.get("question_id"),
                "question": (r.get("question_text") or "")[:120],
                "user_answer": r.get("user_answer"),
                "correct_answer": r.get("correct_answer"),
                "is_correct": r.get("is_correct")
            })
        return jsonify(out)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    if path.startswith("api/"):
        return jsonify({"error": "API route not found"}), 404
        
    target = STATIC_DIR / path
    if path and target.exists():
        return send_from_directory(str(STATIC_DIR), path)
    return send_from_directory(str(STATIC_DIR), "index.html")

if __name__ == "__main__":
    is_debug = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1")
    host_addr = os.getenv("HOST", "0.0.0.0")
    port_num = int(os.getenv("PORT", 5000))
    print(f"\n[START] AptitudeIQ -> http://{host_addr}:{port_num}\n")
    app.run(debug=is_debug, use_reloader=False, host=host_addr, port=port_num)
    