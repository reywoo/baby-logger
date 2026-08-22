# Antigravity Agent Guidelines

## 1. Execution & Service Management
- **ALWAYS** run, manage, and restart the application and services using **Docker** and **Docker Compose**.
- Do not run bare `node server/index.js` or `npm run dev` as the main long-running service.
- When applying code changes or rebuilding:
  ```powershell
  docker compose up -d --build
  ```
- To view running service logs:
  ```powershell
  docker compose logs -f family-assistant
  ```
- To inspect container status:
  ```powershell
  docker compose ps
  ```

## 2. Database & Persistence Architecture
- **PostgreSQL is the single source of truth** for all accounts, passwords, sessions, profiles, logs, and timers.
- **Never** hardcode fallback passwords or accounts in application code (e.g. no hardcoded backdoor logins or bootstrap passwords).
- **Never** silently fallback to local JSON storage when database mutations fail. If an operation fails against the database, report the error directly.
- Ensure all password mutations (`updateDbAccountPassword`) verify against the database and support identifier lookup by either `id` or `username`.
