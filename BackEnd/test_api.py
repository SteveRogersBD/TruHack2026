"""Integration test — requires a running server at BASE_URL."""
import uuid
import requests

BASE_URL = "http://127.0.0.1:8000"


def test_flow():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"

    # --- Register ---
    print(f"--- Registering: {email} ---")
    res = requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password, "role": "student"})
    assert res.status_code == 200, res.text
    data = res.json()
    token = data["access_token"]
    print(f"Registered. Token: {token[:10]}...")

    # --- Login ---
    print("\n--- Login ---")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login OK")

    # --- Create session with learning goal ---
    print("\n--- Create session ---")
    res = requests.post(f"{BASE_URL}/sessions", headers=headers, json={
        "title": "Python Loops",
        "learning_goal": "Learn Python for loops"
    })
    assert res.status_code == 200, res.text
    session = res.json()
    session_id = session["id"]
    assert session["learning_goal"] == "Learn Python for loops"
    print(f"Session: {session_id}")

    # --- Set goal ---
    print("\n--- Set goal ---")
    res = requests.put(f"{BASE_URL}/sessions/{session_id}/goal", headers=headers, json={"goal": "Master Python for loops"})
    assert res.status_code == 200, res.text
    assert res.json()["learning_goal"] == "Master Python for loops"
    print("Goal set")

    # --- Save code ---
    print("\n--- Save code ---")
    code = "for i in range(5):\n    print(i)"
    res = requests.put(f"{BASE_URL}/sessions/{session_id}/code", headers=headers, json={"code": code})
    assert res.status_code == 200, res.text
    assert res.json()["saved"] is True
    print("Code saved")

    # --- Execute code ---
    print("\n--- Execute code ---")
    res = requests.post(f"{BASE_URL}/sessions/{session_id}/execute", headers=headers, json={"code": code, "language": "python"})
    assert res.status_code == 200, res.text
    exec_data = res.json()
    print(f"Execution output: {exec_data['execution']['output'][:60]}")
    print(f"Success: {exec_data['execution']['success']}")
    assert exec_data["structured"] is not None, "Expected structured tutor response"
    structured = exec_data["structured"]
    print(f"Emotion: {structured['emotion']}")
    print(f"Canvas mode: {structured['canvas_mode']}")
    print(f"Speech: {structured['speech'][:80]}...")
    assert len(structured["canvas_actions"]) > 0
    assert len(structured["follow_up_suggestions"]) > 0

    # --- Chat ---
    print("\n--- Chat ---")
    res = requests.post(f"{BASE_URL}/sessions/{session_id}/chat", headers=headers, json={"message": "Why does range(5) start at 0?"})
    assert res.status_code == 200, res.text
    chat_data = res.json()
    print(f"Reply: {chat_data['reply']['content'][:80]}...")
    assert chat_data["structured"] is not None
    print(f"Follow-ups: {chat_data['structured']['follow_up_suggestions']}")

    # --- Message history ---
    print("\n--- Message history ---")
    res = requests.get(f"{BASE_URL}/sessions/{session_id}/messages", headers=headers)
    assert res.status_code == 200, res.text
    messages = res.json()["messages"]
    print(f"Total messages: {len(messages)}")
    for m in messages:
        print(f"  [{m['role']}] {m['content'][:50]}...")

    # --- Session state persisted ---
    print("\n--- Verify session state ---")
    res = requests.get(f"{BASE_URL}/sessions/{session_id}", headers=headers)
    assert res.status_code == 200, res.text
    s = res.json()
    assert s["learning_goal"] == "Master Python for loops"
    assert s["current_code"] == code
    print("Session state persisted correctly")

    # --- Delete session ---
    print("\n--- Delete session ---")
    res = requests.delete(f"{BASE_URL}/sessions/{session_id}", headers=headers)
    assert res.status_code == 200, res.text
    print("Deleted")

    print("\n=== All tests passed ===")


if __name__ == "__main__":
    test_flow()
