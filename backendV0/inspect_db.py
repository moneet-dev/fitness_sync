import sqlite3, pathlib
db = pathlib.Path("backendV0/app.db")
conn = sqlite3.connect(db)
cur = conn.cursor()
rows = list(cur.execute("SELECT id,email,full_name,role,hashed_password FROM users ORDER BY id DESC LIMIT 10"))
for r in rows:
    print(r)
conn.close()