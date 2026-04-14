# DayForge — Personal Task Tracker

A personal Jira-like task manager that helps you focus on **one thing at a time** by enforcing a structured workflow: Backlog → Approval → Today/Tomorrow → In Progress → Done.

## Architecture

- **Frontend**: React + TypeScript + Vite + TailwindCSS (port 5173)
- **Backend**: Python FastAPI + SQLAlchemy + SQLite (port 8000)
- **Database**: SQLite (file-based, zero setup)

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Key Concepts

- **Backlog**: All new tasks land here
- **Approval Queue**: Moving tasks from backlog to today/tomorrow requires approval
- **Today's List**: Your focused work list for the day
- **Yesterday Summary**: Review what you accomplished

## Coming Soon (AI Integration)

1. MCP servers to auto-fetch tasks from Outlook, Figma, Jira
2. AI-powered time estimation for tasks
3. Productivity analytics and recommendations
