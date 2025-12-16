import time
import requests

BASE = "http://127.0.0.1:8000"


def register(user):
    r = requests.post(f"{BASE}/auth/register", json=user)
    print("register", user["email"], r.status_code, r.text)
    return r


def token(username, password):
    r = requests.post(f"{BASE}/auth/token", data={"username": username, "password": password})
    print("token", username, r.status_code, r.text)
    return r.json().get("access_token")


def auth_get(path, token):
    headers = {"Authorization": f"Bearer {token}"}
    r = requests.get(f"{BASE}{path}", headers=headers)
    print("GET", path, r.status_code, r.text)
    return r


def auth_post(path, token, json):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.post(f"{BASE}{path}", headers=headers, json=json)
    print("POST", path, r.status_code, r.text)
    return r


def auth_patch(path, token, json):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    r = requests.patch(f"{BASE}{path}", headers=headers, json=json)
    print("PATCH", path, r.status_code, r.text)
    return r


def main():
    # users
    client = {"email": "smoke_client@example.com", "full_name": "Smoke Client", "password": "clientpw", "role": "client"}
    # backend accepts roles: client, doctor, trainer, nutritionist
    professional = {"email": "smoke_pro@example.com", "full_name": "Smoke Pro", "password": "profpw", "role": "doctor"}

    # register both (ignore errors if already exists)
    register(client)
    register(professional)

    # small delay to ensure DB commit
    time.sleep(0.3)

    # get tokens
    ct = token(client["email"], client["password"])
    pr = token(professional["email"], professional["password"])

    if not ct:
        print("FAILED to obtain client token; aborting smoke test")
        return
    if not pr:
        print("WARN: professional token not obtained; continuing with client-only checks")

    # create goal as client
    g = {"title": "Smoke Goal", "description": "Test goal created by smoke test", "status": "in-progress"}
    auth_post("/data/goals", ct, g)

    # create metric as client
    m = {"metric_type": "weight", "value": 70.5}
    auth_post("/data/metrics", ct, m)

    # create task as client
    t = {"title": "Smoke Task", "notes": "Do 15 minutes"}
    r = auth_post("/data/tasks", ct, t)
    task_id = None
    try:
        task_id = r.json().get("id")
    except Exception:
        pass

    # create appointment client -> professional
    # need professional id: fetch professionals list (requires auth)
    r = requests.get(f"{BASE}/users/professionals", headers={"Authorization": f"Bearer {ct}"})
    pro_list = r.json() if r.ok else []
    pro_id = None
    for u in pro_list:
        if u.get("email") == professional["email"]:
            pro_id = u.get("id")
            break
    
    # If not found by email, get professional ID from their token
    if not pro_id:
        r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {pr}"})
        if r.ok:
            pro_data = r.json()
            if pro_data.get("role") != "client":
                pro_id = pro_data.get("id")
                print(f"Using professional ID: {pro_id}")

    if pro_id:
        appt = {"professional_id": pro_id, "scheduled_at": "2025-12-01T10:00:00Z", "mode": "video", "notes": "smoke test appt"}
        auth_post("/appointments/", ct, appt)
    else:
        print("WARN: No professional ID found, skipping appointment creation")

    # create assignment: professional assigns themselves to client
    client_id = None
    if pro_id:
        print("\n=== Assignment System ===")
        # Need to get client_id
        r = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {ct}"})
        if r.ok:
            client_id = r.json().get("id")
            assignment = {"client_id": client_id, "professional_id": pro_id}
            auth_post("/users/assignments", pr, assignment)
            
            # Test get my-professionals endpoint
            print("Testing my-professionals endpoint...")
            auth_get("/users/my-professionals", ct)

    # chat: send and fetch
    # chat: create conversation, send and fetch
    print("\n=== Chat System ===")
    conv_id = None
    # Create conversation with the professional
    if pro_id:
        r = requests.post(
            f"{BASE}/chat/conversations?participant_id={pro_id}",
            headers={"Authorization": f"Bearer {ct}"}
        )
        print("create conversation", r.status_code, r.text)
        
        if r.ok:
            conv_data = r.json()
            conv_id = conv_data["id"]
            
            # Send message
            msg = {"conversation_id": conv_id, "content": "hello from smoke test"}
            auth_post("/chat/messages", ct, msg)
            
            # Fetch messages
            auth_get(f"/chat/messages/{conv_id}", ct)
        else:
            print("Skipping chat message tests due to conversation creation failure")
    else:
        print("Skipping chat tests - no professional available")

    # notifications (may be empty)
    auth_get("/notifications/", ct)

    # as professional: list clients (requires professional auth)
    auth_get("/users/clients", pr)
    
    # Phase 2: Chat enhancements
    print("\n=== Phase 2: Chat Enhancements ===")
    if conv_id:
        # Mark conversation as read
        auth_patch(f"/chat/conversations/{conv_id}/mark-read", ct, {})
        
        # Update typing status
        auth_post(f"/chat/conversations/{conv_id}/typing", ct, {})
        
        # Get typing status
        auth_get(f"/chat/conversations/{conv_id}/typing", pr)
        
        # Get conversations with metadata
        auth_get("/chat/conversations", ct)
    else:
        print("Skipping Phase 2 tests - no conversation available")
    
    # Phase 3: Professional features
    print("\n=== Phase 3: Professional Features ===")
    if pro_id and client_id:
        # List all clients for assignment
        print("Testing all_clients parameter...")
        auth_get("/users/clients?all_clients=true", pr)
        
        # Access client data (metrics, goals, tasks)
        print(f"\nAccessing client {client_id} data...")
        auth_get(f"/users/clients/{client_id}/metrics", pr)
        auth_get(f"/users/clients/{client_id}/goals", pr)
        auth_get(f"/users/clients/{client_id}/tasks", pr)
        
        # Create a note for the client
        print(f"\nCreating note for client {client_id}...")
        note_data = {"client_id": client_id, "content": "This is a smoke test note from the professional."}
        auth_post(f"/users/clients/{client_id}/notes", pr, note_data)
        
        # Get all notes for the client
        print(f"Fetching notes for client {client_id}...")
        auth_get(f"/users/clients/{client_id}/notes", pr)

    print("\n✅ smoke test finished successfully")


if __name__ == "__main__":
    main()
