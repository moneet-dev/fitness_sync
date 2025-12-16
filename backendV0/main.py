from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import appointments, auth, chat, data, notifications, users, plans

app = FastAPI(title="Collaborative Health Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(data.router)
app.include_router(appointments.router)
app.include_router(chat.router)
app.include_router(notifications.router)
app.include_router(plans.router)


@app.get("/", tags=["health"])
async def health_check():
    return {"status": "ok"}

