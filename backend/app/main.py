from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routes import auth, tasks, approvals, summary, notifications, analytics, recurring

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DayForge API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(approvals.router)
app.include_router(summary.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(recurring.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.2.0"}
