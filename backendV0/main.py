from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import appointments, auth, chat, data, notifications, users, plans

app = FastAPI(title="Collaborative Health Platform API", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",  # Metro bundler alternative port
        "http://localhost:8000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://127.0.0.1:8000",
        "http://localhost:19006",  # Expo web dev server
        "http://127.0.0.1:19006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
async def root():
    return {"status": "ok"}

