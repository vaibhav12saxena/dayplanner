# Database Migrations Guide

## The Problem We Had

```
┌─────────────────────────────────────────────────────────┐
│ What happened when we added due_date column:           │
└─────────────────────────────────────────────────────────┘

Step 1: We updated models.py
┌──────────────────────────┐
│ models.py (Python code)  │
│ ─────────────────────    │
│ class Task:              │
│   title                  │
│   status                 │
│   delivery_date          │
│   due_date  ← NEW!       │
└──────────────────────────┘

Step 2: But the database file was old
┌──────────────────────────┐
│ dayplanner.db (SQLite)     │
│ ─────────────────────    │
│ tasks table:             │
│   title                  │
│   status                 │
│   delivery_date          │
│   ❌ NO due_date column! │
└──────────────────────────┘

Step 3: SQLAlchemy tried to read
┌──────────────────────────────────────┐
│ SQLAlchemy: "Give me due_date"       │
│ SQLite: "I don't have that column!"  │
│ Result: 💥 CRASH                     │
└──────────────────────────────────────┘
```

## The Solution: Migrations

```
┌─────────────────────────────────────────────────────────┐
│ How migrations work:                                    │
└─────────────────────────────────────────────────────────┘

1. You change models.py
   ┌──────────────────┐
   │ Add due_date     │
   └──────────────────┘
           ↓
2. Generate migration file
   $ alembic revision --autogenerate -m "add due_date"
   ┌────────────────────────────────────────────┐
   │ alembic/versions/abc123_add_due_date.py    │
   │ ──────────────────────────────────────     │
   │ def upgrade():                             │
   │     op.add_column('tasks',                 │
   │         Column('due_date', String))        │
   │                                            │
   │ def downgrade():                           │
   │     op.drop_column('tasks', 'due_date')    │
   └────────────────────────────────────────────┘
           ↓
3. Apply migration to database
   $ alembic upgrade head
   ┌────────────────────────────────────────┐
   │ dayplanner.db BEFORE:                    │
   │ ─────────────────────                  │
   │ tasks: title, status, delivery_date    │
   │                                        │
   │ ↓ Migration runs ↓                     │
   │                                        │
   │ dayplanner.db AFTER:                     │
   │ ─────────────────────                  │
   │ tasks: title, status, delivery_date,   │
   │        due_date ← ADDED!               │
   │                                        │
   │ ✅ All existing data preserved!        │
   └────────────────────────────────────────┘
```

## How Production Apps Handle This

```
┌─────────────────────────────────────────────────────────┐
│ Development → Staging → Production                      │
└─────────────────────────────────────────────────────────┘

Developer's laptop:
┌────────────────────────────────────┐
│ 1. Edit models.py                  │
│ 2. alembic revision --autogenerate │
│ 3. alembic upgrade head            │
│ 4. Test locally                    │
│ 5. Commit migration file to Git    │
└────────────────────────────────────┘
         ↓ git push
         
Staging server:
┌────────────────────────────────────┐
│ 1. git pull (gets migration file)  │
│ 2. alembic upgrade head            │
│ 3. Test on staging data            │
└────────────────────────────────────┘
         ↓ if tests pass
         
Production server:
┌────────────────────────────────────┐
│ 1. git pull                        │
│ 2. alembic upgrade head            │
│ 3. ✅ Column added, no data lost!  │
└────────────────────────────────────┘
```

## Migration File Example

When you run `alembic revision --autogenerate -m "add due_date"`, it creates:

```python
"""add due_date to tasks

Revision ID: abc123def456
Revises: previous_migration_id
Create Date: 2026-04-15 03:00:00
"""
from alembic import op
import sqlalchemy as sa

# Unique ID for this migration
revision = 'abc123def456'
down_revision = 'previous_migration_id'  # Points to previous migration

def upgrade():
    """Apply changes."""
    # Alembic auto-detected we added a column!
    op.add_column('tasks', 
        sa.Column('due_date', sa.String(), nullable=True))

def downgrade():
    """Undo changes (if needed)."""
    op.drop_column('tasks', 'due_date')
```

## Common Migration Operations

```python
# Add column
op.add_column('tasks', sa.Column('new_field', sa.String()))

# Remove column
op.drop_column('tasks', 'old_field')

# Rename column
op.alter_column('tasks', 'old_name', new_column_name='new_name')

# Add index
op.create_index('idx_task_status', 'tasks', ['status'])

# Create new table
op.create_table('new_table',
    sa.Column('id', sa.Integer(), primary_key=True),
    sa.Column('name', sa.String(50))
)

# Add foreign key
op.create_foreign_key('fk_task_user', 'tasks', 'users', 
    ['user_id'], ['id'])
```

## Alembic Commands Cheat Sheet

```bash
# Initialize Alembic (one-time setup)
alembic init alembic

# Generate migration from model changes
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Apply specific migration
alembic upgrade abc123

# Rollback one migration
alembic downgrade -1

# Rollback to specific migration
alembic downgrade abc123

# Show current migration version
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic show head
```

## Why We Deleted the Database (and why that's OK for dev)

**In development:**
- Deleting the DB is fine — you can recreate test data
- Faster than writing migrations for every tiny change
- Common workflow: delete DB → restart app → SQLAlchemy creates tables

**In production:**
- **NEVER delete the database!** (you'd lose all user data)
- Always use migrations
- Test migrations on a copy first
- Have backups before running migrations

## Setting Up Migrations for This Project

We've already installed Alembic and configured it. To use it:

```bash
cd backend

# 1. Create initial migration (captures current schema)
alembic revision --autogenerate -m "initial schema"

# 2. Apply it (creates tables in database)
alembic upgrade head

# 3. Later, when you add a field to models.py:
alembic revision --autogenerate -m "add new field"
alembic upgrade head  # Adds column without deleting data!
```

## SQLite vs PostgreSQL for Migrations

**SQLite limitations:**
- Can't drop columns easily (needs table recreation)
- Can't alter column types directly
- Alembic works around this but it's slower

**PostgreSQL advantages:**
- Full ALTER TABLE support
- Can add/drop/modify columns easily
- Better for production migrations
- Concurrent migrations (multiple servers)

**Recommendation:**
- Use SQLite for local development (it's fine!)
- Use PostgreSQL for production
- Alembic works with both!

## Production Database URL Pattern

```python
# database.py
import os

# Use environment variable for production
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./dayplanner.db"  # Default for local dev
)

# In production, set environment variable:
# DATABASE_URL=postgresql://user:pass@db.example.com:5432/dayplanner
```

This way:
- Local dev: uses SQLite (no setup needed)
- Production: uses PostgreSQL (set via environment variable)
- Same code works everywhere!
