# Database Explained: SQLite, Migrations, and Production

## Your Questions Answered

### 1. Why did we have to delete the database when adding a column?

**Short answer:** We didn't set up database migrations.

**What happened:**
- We added a new column `due_date` to the `Task` model in Python code
- But the actual SQLite database file (`dayplanner.db`) still had the old schema without that column
- When SQLAlchemy tried to read tasks, it expected `due_date` but the database didn't have it → crash

**What production apps do:**
They use **migration tools** like:
- **Alembic** (Python/SQLAlchemy) ← we just installed this
- **Django migrations** (Django framework)
- **Prisma migrate** (Node.js)
- **Flyway/Liquibase** (Java)

These tools:
1. **Track schema changes** as versioned migration files (like Git for your database)
2. **Apply changes incrementally** without losing data
3. **Can rollback** if something goes wrong

**Example migration workflow:**
```bash
# 1. Make changes to models.py (add due_date column)
# 2. Generate migration file
alembic revision --autogenerate -m "add due_date to tasks"

# 3. Apply migration to database (adds column without deleting data)
alembic upgrade head

# 4. If needed, rollback
alembic downgrade -1
```

The migration file looks like:
```python
def upgrade():
    op.add_column('tasks', sa.Column('due_date', sa.String(), nullable=True))

def downgrade():
    op.drop_column('tasks', 'due_date')
```

---

### 2. Are users and tasks in the same database or different?

**Same database, different tables.**

Think of a database like an Excel workbook:
- **Database** = the entire `.db` file (like `dayplanner.db`)
- **Tables** = individual sheets inside (like "Users", "Tasks", "Approvals", "Notifications")

Our `dayplanner.db` contains 4 tables:
```
dayplanner.db
├── users          (id, email, username, password, ...)
├── tasks          (id, title, status, assignee_id, creator_id, ...)
├── approval_requests (id, task_id, status, ...)
└── notifications  (id, user_id, title, message, ...)
```

They're **related** through foreign keys:
- `tasks.assignee_id` → points to `users.id`
- `tasks.creator_id` → points to `users.id`
- `approval_requests.task_id` → points to `tasks.id`

---

### 3. Is SQLite a NoSQL or SQL database?

**SQLite is a SQL (relational) database.**

| Type | Examples | Structure | Query Language |
|------|----------|-----------|----------------|
| **SQL (Relational)** | SQLite, PostgreSQL, MySQL, SQL Server | Tables with rows & columns, strict schema | SQL |
| **NoSQL** | MongoDB, Redis, Cassandra, DynamoDB | Documents/Key-Value/Graph, flexible schema | Varies |

**SQL databases:**
- Data in tables with defined columns
- Relationships via foreign keys
- ACID transactions (Atomic, Consistent, Isolated, Durable)
- Use SQL query language: `SELECT * FROM users WHERE id = 1`

**NoSQL databases:**
- Flexible schema (MongoDB stores JSON-like documents)
- Good for unstructured data
- Often faster for specific use cases
- Different query languages

---

### 4. Why didn't we install anything? How is a single file handling everything?

**SQLite is special — it's embedded, not a server.**

**Traditional databases (PostgreSQL, MySQL, MongoDB):**
```
┌─────────────┐         Network          ┌──────────────┐
│ Your App    │ ←──────────────────────→ │ DB Server    │
│ (Python)    │      TCP/IP 5432         │ (PostgreSQL) │
└─────────────┘                          └──────────────┘
                                          Running 24/7
                                          Separate process
                                          Needs installation
```

**SQLite:**
```
┌─────────────────────────────┐
│ Your App (Python)           │
│  ├─ FastAPI code            │
│  └─ SQLite library (built-in)│
│     └─ dayplanner.db (file)   │
└─────────────────────────────┘
    Everything in one process
    No separate server
    Just a file on disk
```

**Why SQLite doesn't need installation:**
- It's a **library**, not a server
- Comes **built-in** with Python (part of the standard library)
- The entire database is **one file** (`dayplanner.db`)
- No network, no authentication, no separate process

**When to use SQLite:**
- ✅ Development/testing
- ✅ Small apps (<100k requests/day)
- ✅ Mobile apps (iOS/Android)
- ✅ Desktop apps
- ✅ Embedded systems

**When NOT to use SQLite (use PostgreSQL/MySQL instead):**
- ❌ High concurrent writes (>100 simultaneous users writing)
- ❌ Large datasets (>100GB)
- ❌ Multiple servers (SQLite is file-based, can't share across servers)
- ❌ Production web apps with heavy traffic

---

### 5. I heard databases are big software — why is SQLite so small?

**SQLite is intentionally minimal.**

| Database | Size | Architecture |
|----------|------|--------------|
| **SQLite** | ~600 KB library | Embedded, serverless, single file |
| **PostgreSQL** | ~200 MB install | Client-server, multi-user, enterprise features |
| **MySQL** | ~400 MB install | Client-server, replication, clustering |
| **MongoDB** | ~500 MB install | Document store, sharding, replica sets |

**Why PostgreSQL/MySQL are "big":**
- User management & authentication
- Network protocol handling
- Concurrent connection pooling
- Replication & backup systems
- Query optimizer for complex queries
- Transaction isolation levels
- Full-text search, JSON support, extensions
- Monitoring & admin tools

**Why SQLite is small:**
- No network layer (just file I/O)
- No user management (file permissions only)
- No separate process (runs in your app)
- Simpler query optimizer
- Fewer features (but still very capable!)

---

## Production Database Setup

For a real production app, you'd use:

### PostgreSQL (most common for Python web apps)

**Install:**
```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt install postgresql
```

**Update database.py:**
```python
# Instead of:
SQLALCHEMY_DATABASE_URL = "sqlite:///./dayplanner.db"

# Use:
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost:5432/dayplanner"
```

**With migrations:**
```bash
# 1. Initial setup
alembic init alembic
# Edit alembic.ini and alembic/env.py (like we did)

# 2. Create initial migration
alembic revision --autogenerate -m "initial schema"

# 3. Apply to database
alembic upgrade head

# 4. Later, when you add a column:
# - Edit models.py
alembic revision --autogenerate -m "add due_date column"
alembic upgrade head  # Applies change without deleting data!
```

---

## Key Takeaways

1. **SQLite = SQL database, just embedded** (not NoSQL)
2. **One database file = multiple tables** (users, tasks, etc. all in `dayplanner.db`)
3. **Use migrations in production** (Alembic) to avoid deleting data
4. **SQLite is great for dev**, but use PostgreSQL for production web apps
5. **No installation needed** because SQLite is a library, not a server

---

## Next Steps for This Project

To make this production-ready:

1. **Set up Alembic properly:**
   ```bash
   # Already installed! Now:
   alembic revision --autogenerate -m "initial"
   alembic upgrade head
   ```

2. **Switch to PostgreSQL** when deploying:
   - Use environment variables for DB URL
   - Keep SQLite for local dev
   - Use PostgreSQL on production server

3. **Add to your workflow:**
   - Every time you change models → create migration
   - Test migrations on dev database first
   - Apply to production with `alembic upgrade head`
