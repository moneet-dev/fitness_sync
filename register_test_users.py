"""
Script to register test users for all personas in the fitness app.
Run this after deleting the database to quickly set up test users.
"""

import requests
import json

API_URL = "http://localhost:8000"
PASSWORD = "Qwertyuiop"

# Define test users for each role
test_users = [
    {"role": "client", "name": "moneet_client", "email": "client@gmail.com"},
    {"role": "doctor", "name": "moneet_doctor", "email": "doctor@gmail.com"},
    {"role": "trainer", "name": "moneet_trainer", "email": "trainer@gmail.com"},
    {"role": "nutritionist", "name": "moneet_nutritionist", "email": "nutritionist@gmail.com"},
    {"role": "supporter", "name": "moneet_supporter", "email": "supporter@gmail.com"},
]

def register_user(name, email, role):
    """Register a single user"""
    payload = {
        "email": email,
        "password": PASSWORD,
        "full_name": name,
        "role": role
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Registered: {name} ({role}) - ID: {data['id']}")
            return data
        else:
            print(f"❌ Failed to register {name}: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error registering {name}: {str(e)}")
        return None

def main():
    print("=" * 60)
    print("Registering Test Users")
    print("=" * 60)
    print(f"API URL: {API_URL}")
    print(f"Password for all users: {PASSWORD}")
    print()
    
    registered_users = []
    
    for user in test_users:
        result = register_user(user["name"], user["email"], user["role"])
        if result:
            registered_users.append({
                "id": result["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            })
        print()
    
    print("=" * 60)
    print(f"Registration Complete: {len(registered_users)}/{len(test_users)} users")
    print("=" * 60)
    print()
    print("📝 Test User Credentials:")
    print("-" * 60)
    for user in registered_users:
        print(f"{user['role'].upper():<15} | {user['email']:<25} | {PASSWORD}")
    print("-" * 60)
    print()
    print("📋 Next Steps:")
    print("1. Login as each professional (doctor, trainer, nutritionist, supporter)")
    print("2. Generate invite codes from their dashboards")
    print("3. Login as client and use invite codes to connect")
    print("4. Test care team chat, collaborative notes/goals, and appointment requests")
    print()

if __name__ == "__main__":
    main()
