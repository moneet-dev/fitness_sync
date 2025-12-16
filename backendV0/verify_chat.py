import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def register(email, password, role, name):
    print(f"Registering {name} ({role})...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "role": role,
        "full_name": name
    })
    if res.status_code not in [200, 201]:
        if "Email already registered" in res.text:
            raise Exception("Already registered")
        print(f"Failed to register {name}: {res.text}")
        sys.exit(1)
    return res.json()

def login(email, password):
    print(f"Logging in {email}...")
    res = requests.post(f"{BASE_URL}/auth/token", data={
        "username": email,
        "password": password
    })
    if res.status_code != 200:
        print(f"Failed to login {email}: {res.text}")
        sys.exit(1)
    return res.json()["access_token"]

def main():
    # 1. Register Users
    client_email = "client@test.com"
    pro_email = "pro@test.com"
    password = "password123"
    
    try:
        register(client_email, password, "client", "Test Client")
    except Exception:
        print("Client likely already registered")

    try:
        register(pro_email, password, "trainer", "Test Trainer")
    except Exception:
        print("Trainer likely already registered")

    # 2. Login
    client_token = login(client_email, password)
    pro_token = login(pro_email, password)
    
    client_headers = {"Authorization": f"Bearer {client_token}"}
    pro_headers = {"Authorization": f"Bearer {pro_token}"}

    # 3. Get Professionals (to find ID)
    print("Fetching professionals...")
    res = requests.get(f"{BASE_URL}/users/professionals", headers=client_headers)
    pros = res.json()
    target_pro = next((p for p in pros if p["email"] == pro_email), None)
    if not target_pro:
        print("Professional not found in list")
        sys.exit(1)
    print(f"Found professional: {target_pro['id']}")

    # 4. Create Conversation
    print("Creating conversation...")
    res = requests.post(
        f"{BASE_URL}/chat/conversations", 
        params={"participant_id": target_pro['id']},
        headers=client_headers
    )
    if res.status_code != 200:
        print(f"Failed to create conversation: {res.text}")
        sys.exit(1)
    
    conversation = res.json()
    conv_id = conversation['id']
    print(f"Conversation created/retrieved. ID: {conv_id}")
    print(f"Other participant: {conversation.get('other_participant_name')}")

    # 5. Send Message (Client -> Pro)
    print("Sending message...")
    res = requests.post(
        f"{BASE_URL}/chat/messages",
        json={"conversation_id": conv_id, "content": "Hello from Client!"},
        headers=client_headers
    )
    if res.status_code != 201:
        print(f"Failed to send message: {res.text}")
        sys.exit(1)
    print("Message sent.")

    # 6. Read Messages (Pro)
    print("Reading messages as Professional...")
    res = requests.get(
        f"{BASE_URL}/chat/messages/{conv_id}",
        headers=pro_headers
    )
    if res.status_code != 200:
        print(f"Failed to read messages: {res.text}")
        sys.exit(1)
    
    messages = res.json()
    print(f"Messages found: {len(messages)}")
    if len(messages) > 0:
        print(f"Latest message: {messages[-1]['content']} from {messages[-1]['sender_name']}")
        if messages[-1]['content'] == "Hello from Client!":
            print("SUCCESS: Message content verified.")
        else:
            print("FAILURE: Message content mismatch.")
    else:
        print("FAILURE: No messages found.")

if __name__ == "__main__":
    main()
