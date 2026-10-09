# Instagram AI Sales Automation Platform

A production-ready full-stack platform that connects your Instagram Professional account to an AI-driven sales automation pipeline powered by NestJS, PostgreSQL (Prisma), Redis (BullMQ), and OpenRouter LLMs.

---

## System Architecture

```text
React Dashboard (Vite + Tailwind v4 + React Query)
       |
       | REST API (JWT Authenticated)
       v
NestJS Backend
       |
       +-------------------+
       |                   |
       v                   v
   PostgreSQL          Redis/BullMQ
 (Prisma ORM)        (Message Worker)
       |                   |
       |                   v
       |          +--------+--------+
       |          |                 |
       v          v                 v
   Products   Product Tools     OpenRouter
 (Live Stock) (check_stock,...) (AI Formulation)
                                   |
                                   v
                              AI Response
                                   |
                                   v
                          Instagram Graph API
                                   |
                                   v
                              Customer
```

---

## Tech Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, Lucide Icons
* **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Passport JWT, AES-256-GCM Token Encryption, BullMQ, Redis, Axios
* **AI Provider**: OpenRouter (OpenAI-compatible SDK)
* **Instagram**: Official Meta Graph API & Webhook Ingress

---

## Getting Started

### 1. Prerequisites
* Node.js >= 20
* PostgreSQL running locally or in Docker
* Redis running locally or in Docker

### 2. Environment Setup
```bash
cp backend/.env.example backend/.env
```

### 3. Database Migration & Seeding
```bash
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

Default credentials:
* **Email**: `admin@instabot.com`
* **Password**: `admin123456`

### 4. Running the Application
```bash
# Backend (Port 3000)
cd backend && npm run start:dev

# Frontend (Port 5173)
cd frontend && npm run dev
```
