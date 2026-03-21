import requests
import time
import uuid

BASE_URL = "http://127.0.0.1:8000"

def test_flow():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"

    print(f"--- Registering user: {email} ---")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "role": "student"
    })
    print(f"Status: {reg_res.status_code}")
    reg_data = reg_res.json()
    print(f"Response: {reg_data}")
    token = reg_data["access_token"]
    user_id = reg_data["user"]["id"]

    print(f"\n--- Logging in: {email} ---")
    log_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    print(f"Status: {log_res.status_code}")
    log_data = log_res.json()
    token = log_data["access_token"]
    print(f"New token received: {token[:10]}...")

    headers = {"Authorization": f"Bearer {token}"}

    print(f"\n--- Creating session ---")
    sess_res = requests.post(f"{BASE_URL}/sessions", headers=headers, json={"title": "Math Homework"})
    print(f"Status: {sess_res.status_code}")
    session_id = sess_res.json()["id"]
    print(f"Session ID: {session_id}")

    print(f"\n--- Sending chat message ---")
    chat_payload = {"message": "Hi, can you help me solve 2+2?"}
    chat_res = requests.post(f"{BASE_URL}/sessions/{session_id}/chat", headers=headers, json=chat_payload)
    print(f"Status: {chat_res.status_code}")
    reply = chat_res.json()["reply"]["content"]
    print(f"Agent Reply: {reply}")

    print(f"\n--- Checking history (persistence) ---")
    hist_res = requests.get(f"{BASE_URL}/sessions/{session_id}/messages", headers=headers)
    print(f"Status: {hist_res.status_code}")
    messages = hist_res.json()["messages"]
    print(f"Total messages in history: {len(messages)}")
    for msg in messages:
        print(f"[{msg['role']}]: {msg['content'][:50]}...")

if __name__ == "__main__":
    test_flow()
