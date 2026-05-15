# Cloud Backup & Restore Automation System

A full-stack cloud backup and restore system that automates secure database backups, encrypts backup data, stores files in cloud object storage, and restores data whenever required.

---

# Features

- Automated database backup system
- Manual backup trigger
- Secure AES-256 encryption
- Cloud object storage using Supabase Storage
- Restore workflow implementation
- Backup logs dashboard
- React frontend dashboard
- PostgreSQL database integration
- Fully deployed backend on Render

---

# Tech Stack

## Frontend
- React.js
- Axios

## Backend
- Node.js
- Express.js

## Database
- PostgreSQL (Supabase)

## Cloud Storage
- Supabase Storage

## Deployment
- Render

---

# Project Structure

```bash
cloud-backup-project/
│
├── src/
│   ├── backup.js
│   ├── scheduler.js
│   ├── server.js
│   └── restore.js
│
├── .env
├── package.json
└── README.md
```

---

# Environment Variables

Create a `.env` file in the root directory.

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

DB_HOST=your_db_host
DB_PORT=6543
DB_NAME=postgres
DB_USER=your_db_user
DB_PASSWORD=your_db_password

ENCRYPTION_KEY=your_32_character_key
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/your-username/cloud-backup-project.git
```

## Install Dependencies

```bash
npm install
```

## Start Backend Server

```bash
node src/server.js
```

## Start Scheduler

```bash
node src/scheduler.js
```

---

# Frontend Setup

```bash
cd backup-dashboard
npm install
npm start
```

---

# API Endpoints

## Home

```http
GET /
```

## Trigger Backup

```http
POST /backup
```

## View Backup Logs

```http
GET /logs
```

## Restore Backup

```http
POST /restore
```

Request Body:

```json
{
  "filename": "backup-123456.txt"
}
```

---

# Encryption

Backup files are encrypted using:

```text
AES-256-CBC
```

This ensures secure storage and safe cloud backup handling.

---

# Restore Workflow

1. Select backup file
2. Download encrypted backup from Supabase Storage
3. Decrypt backup file
4. Parse backup data
5. Restore records into PostgreSQL database

---

# Deployment

## Backend Deployment
The backend API is deployed on Render.

Backend URL:

```text
https://cloud-backup-project.onrender.com
```

## Frontend Deployment
Frontend dashboard can be deployed using Netlify or Vercel.

---

# Output

- Automated encrypted backups
- Secure cloud storage
- Backup restore functionality
- Live cloud deployment
- Dashboard for backup monitoring

---

# Author

Usha Lalitha
