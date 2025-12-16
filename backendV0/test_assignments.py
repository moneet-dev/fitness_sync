"""
Quick test script to verify assignment endpoints work correctly.
Run this with the backend server running on http://127.0.0.1:8000
"""
import requests

BASE = "http://127.0.0.1:8000"

def test_assignment_system():
    print("=" * 60)
    print("Testing Assignment System")
    print("=" * 60)
    
    # 1. Register users (or use existing)
    client_data = {"email": "assign_client@test.com", "full_name": "Assignment Client", "password": "password123", "role": "client"}
    prof_data = {"email": "assign_prof@test.com", "full_name": "Assignment Professional", "password": "password123", "role": "doctor"}
    
    print("\n1. Registering users...")
    for user_data in [client_data, prof_data]:
        r = requests.post(f"{BASE}/auth/register", json=user_data)
        if r.status_code in [200, 201]:
            print(f"   ✓ Registered {user_data['full_name']}")
        elif "already registered" in r.text.lower():
            print(f"   - {user_data['full_name']} already exists")
        else:
            print(f"   ✗ Failed to register {user_data['full_name']}: {r.text}")
    
    # 2. Login both users
    print("\n2. Logging in users...")
    ct_resp = requests.post(f"{BASE}/auth/token", data={"username": client_data["email"], "password": client_data["password"]})
    pr_resp = requests.post(f"{BASE}/auth/token", data={"username": prof_data["email"], "password": prof_data["password"]})
    
    if ct_resp.status_code != 200 or pr_resp.status_code != 200:
        print("   ✗ Login failed")
        return
    
    client_token = ct_resp.json()["access_token"]
    prof_token = pr_resp.json()["access_token"]
    print("   ✓ Both users logged in")
    
    # 3. Get user IDs
    print("\n3. Getting user IDs...")
    client_resp = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {client_token}"})
    prof_resp = requests.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {prof_token}"})
    
    client_id = client_resp.json()["id"]
    prof_id = prof_resp.json()["id"]
    print(f"   Client ID: {client_id}")
    print(f"   Professional ID: {prof_id}")
    
    # 4. Create assignment (professional assigns themselves to client)
    print("\n4. Creating assignment...")
    assignment_data = {"client_id": client_id, "professional_id": prof_id}
    r = requests.post(
        f"{BASE}/users/assignments",
        json=assignment_data,
        headers={"Authorization": f"Bearer {prof_token}"}
    )
    
    if r.status_code == 201:
        print(f"   ✓ Assignment created successfully")
        print(f"   Assignment ID: {r.json()['id']}")
    elif r.status_code == 409:
        print(f"   - Assignment already exists")
    else:
        print(f"   ✗ Failed to create assignment: {r.status_code} - {r.text}")
    
    # 5. Client checks their assigned professionals
    print("\n5. Testing GET /users/my-professionals (client)...")
    r = requests.get(
        f"{BASE}/users/my-professionals",
        headers={"Authorization": f"Bearer {client_token}"}
    )
    
    if r.status_code == 200:
        professionals = r.json()
        print(f"   ✓ Found {len(professionals)} assigned professional(s)")
        for prof in professionals:
            print(f"      - {prof['full_name']} ({prof['role']})")
    else:
        print(f"   ✗ Failed: {r.status_code} - {r.text}")
    
    # 6. Professional checks their assigned clients
    print("\n6. Testing GET /users/clients (professional)...")
    r = requests.get(
        f"{BASE}/users/clients",
        headers={"Authorization": f"Bearer {prof_token}"}
    )
    
    if r.status_code == 200:
        clients = r.json()
        print(f"   ✓ Found {len(clients)} assigned client(s)")
        for client in clients:
            print(f"      - {client['full_name']} ({client['role']})")
    else:
        print(f"   ✗ Failed: {r.status_code} - {r.text}")
    
    # 7. Test filtered professionals endpoint
    print("\n7. Testing GET /users/professionals?assigned_only=true (client)...")
    r = requests.get(
        f"{BASE}/users/professionals?assigned_only=true",
        headers={"Authorization": f"Bearer {client_token}"}
    )
    
    if r.status_code == 200:
        professionals = r.json()
        print(f"   ✓ Found {len(professionals)} assigned professional(s)")
        for prof in professionals:
            print(f"      - {prof['full_name']}")
    else:
        print(f"   ✗ Failed: {r.status_code} - {r.text}")
    
    print("\n" + "=" * 60)
    print("✅ Assignment System Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        test_assignment_system()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Backend server is not running on http://127.0.0.1:8000")
        print("Please start the server first: python -m uvicorn backendV0.main:app")
    except Exception as e:
        print(f"❌ Error: {e}")
