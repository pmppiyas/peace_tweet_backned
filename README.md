# 🕊️ PeaceTweet Backend API

> **Scalable, Event-Driven Backend Architecture for PeaceTweet**  
> Built with **Express**, **NestJS**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, **Apache Kafka**, **Redis**, **Socket.IO**, and **FFmpeg**.

---

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-lightgrey?style=for-the-badge&logo=express&logoColor=black)
![NestJS](https://img.shields.io/badge/NestJS-10.3-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_ORM-5.15-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-Event--Driven-black?style=for-the-badge&logo=apache-kafka&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache--Layer-red?style=for-the-badge&logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.4-black?style=for-the-badge&logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Event-Driven Pipeline (Apache Kafka)](#-event-driven-pipeline-apache-kafka)
- [Caching Layer (Redis)](#-caching-layer-redis)
- [Key Modules & Capabilities](#-key-modules--capabilities)
- [Architecture & Folder Structure](#-architecture--folder-structure)
- [Database Schema (Prisma ORM)](#-database-schema-prisma-orm)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Available Scripts](#-available-scripts)
- [License](#-license)

---

## 🌟 Overview

**PeaceTweet Backend** is a high-throughput, enterprise-ready REST and WebSocket API supporting the PeaceTweet social platform. It manages user authentication, feeds, real-time messaging, emergency blood requests, daily routine bookmarks, multimedia processing, and notifications.

### Core Architectural Pillars
- **Hybrid Service Gateway**: Fast, type-safe Express request pipeline paired with NestJS dependency injection and modularity.
- **Event-Driven Decoupling**: Background tasks (feed fan-out, search indexing, multimedia audio extraction) are delegated to **Apache Kafka** worker microservices.
- **Sub-Millisecond In-Memory Caching**: Powered by **Redis** (with automatic in-memory fallback) for high-traffic endpoints.
- **Bi-Directional Communication**: Real-time events, private chat, and notifications managed via **Socket.IO**.
- **Multi-File Modular Prisma Schemas**: Clean database separation across users, posts, chats, friendships, and routine slots.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Frontend                             │
│   (Optimistic UI, TanStack Query v5 Caching, Socket.IO WebSockets)     │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │                                │
      Real-Time     │                                │ HTTP / REST &
      Socket Events │                                │ Multi-part Uploads
                    │                                │
┌───────────────────┴────────────────────────────────▼───────────────────┐
│                      PeaceTweet Backend Gateway                        │
│                   (Express / NestJS Microservices)                     │
└───────────────▲──────────────────┬──────────────────┬──────────────────┘
                │                  │                  │
    Sub-ms Cache│      Event Stream│     Data Access  │ Media Storage
    Read / Write│       Produce    │     (Prisma ORM) │
                ▼                  ▼                  ▼                  ▼
       ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
       │     Redis      │ │  Apache Kafka   │ │   PostgreSQL   │ │   Cloudinary   │
       │  Cache Layer   │ │  Event Broker   │ │ (Neon Database)│ │ Media Storage  │
       └────────────────┘ └────────┬───────┘ └────────────────┘ └────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │     Post Worker      │                  │     Audio Worker     │
   │  (kafkajs Consumer)  │                  │  (kafkajs Consumer)  │
   ├──────────────────────┤                  ├──────────────────────┤
   │ • post.created       │                  │ • dua.audio.requested│
   │ • post.shared        │                  │ • dua.audio.processed│
   │ • Feed fan-out       │                  │ • FFmpeg extraction  │
   │ • Search indexing    │                  │ • Waveform generator │
   └──────────────────────┘                  └──────────────────────┘
```

---

## ⚡ Event-Driven Pipeline (Apache Kafka)

The backend relies on **Apache Kafka** (`kafkajs`) to guarantee zero-blocking responses for write-heavy and compute-intensive operations:

| Kafka Topic | Producer | Consumer | Action / Responsibility |
| :--- | :--- | :--- | :--- |
| `post.created` | Posts Controller | `PostWorker` | Fans out post to follower feeds, updates cached counter metrics, and indexes hashtags for global search. |
| `post.shared` | Shares Controller | `PostWorker` | Aggregates share analytics, increments viral counters, and logs sharing events. |
| `dua.audio.requested` | Uploads Controller | `AudioWorker` | Takes uploaded video/recitations and executes asynchronous audio extraction via **FFmpeg**. |
| `dua.audio.processed` | `AudioWorker` | Socket Gateway | Emits completion status and streams extracted audio metadata back to the client via WebSockets. |

> **Graceful Fallback**: If Kafka brokers are not configured in local development, an internal EventEmitter automatically acts as an in-memory dispatcher with zero configuration needed.

---

## 🚀 Caching Layer (Redis)

PeaceTweet utilizes **Redis** (`ioredis`) for high-performance caching:

- **Hot Feed Caching**: Public feeds and trending queries are cached with automated TTLs.
- **Session & Unread Counters**: Unread notification and message counts are maintained in fast key-value slots.
- **Resilient Fallback**: If the Redis server is unreachable, the system automatically falls back to an in-memory cache without throwing unhandled exceptions.

---

## 🧩 Key Modules & Capabilities

### 1. 🔐 Authentication & RBAC (`/auth`)
- Secure registration and login with bcrypt password hashing.
- Dual-token strategy: short-lived **JWT Access Tokens** + persistent **Refresh Tokens**.
- Role-Based Access Control (**USER**, **ADMIN**, **MODERATOR**).
- Optional Meta (Facebook) OAuth integration.

### 2. 📝 Posts & Reflections (`/posts`)
- Supports **TEXT**, **DUA**, and **BLOOD_REQUEST** types.
- Paginated feeds (All Posts, Dua-only, Reflections, Questions, Announcements).
- Nested comment threads, reactions (LIKE, LOVE, CARE, etc.), and share counters.
- Multi-image uploads via Cloudinary.

### 3. 💬 Real-Time Messenger (`/chat`)
- One-to-one private conversations powered by **Socket.IO**.
- Online status tracking, typing indicators, and instant message read receipts.
- Live unread message counters updated across multiple connected tabs.

### 4. 👥 Friends & Social Graph (`/friends`)
- Friend requests (Send, Accept, Reject, Cancel).
- Relationship views: Friend Suggestions, Following, and Followers.

### 5. 🩸 Emergency Blood Network (`/blood`)
- Urgent patient requests matching blood groups (A+, B+, O+, AB+, etc.).
- Urgency tags (`REGULAR`, `URGENT`), hospital locations, and direct contact numbers.

### 6. 📿 Saved Routines Hub (`/bookmarks`)
- Organize saved Duas and posts into 5 daily Islamic time slots:
  - **MORNING** (সকাল / Fajr)
  - **NOON** (দুপুর / Dhuhr)
  - **AFTERNOON** (বিকাল / Asr)
  - **EVENING** (সন্ধ্যা / Maghrib)
  - **NIGHT** (রাত / Isha)
- Dynamic slot reassignment without deleting the original saved bookmark.

### 7. 🔔 Live Notifications (`/notifications`)
- Push notifications for likes, comments, friend actions, and emergency blood donation calls.
- One-click "Mark All as Read" and instant unread filter.

---

## 📁 Architecture & Folder Structure

```text
peacetweet_beckend/
├── prisma/
│   └── schema/                        # Multi-file modular Prisma schema
│       ├── schema.prisma              # Datasource & generator config
│       ├── enum.prisma                # Roles, PostType, BloodGroup, TimeSlot
│       ├── user.prisma                # User accounts & verification
│       ├── post.prisma                # Posts, reflections, attachments
│       ├── dua.prisma                 # Authentic Duas with Arabic/Bengali
│       ├── saved_item.prisma          # Saved routine bookmarks & time slots
│       ├── chat.prisma                # Chat rooms, messages, read states
│       ├── friendship.prisma          # Friends graph & pending requests
│       ├── notification.prisma        # Live notification items
│       ├── blood_request.prisma       # Emergency blood donation requests
│       ├── comment.prisma             # Nested comments
│       ├── reaction.prisma            # Post reactions (Like, etc.)
│       └── share.prisma               # Post reshare records
│
├── src/
│   ├── app/
│   │   ├── config/                    # Environment & cache configurations
│   │   ├── helper/                    # JWT generator, pagination, response formats
│   │   ├── middlewares/               # Global error handler, auth guard, rate limiter
│   │   └── modules/                   # Feature-driven Express/NestJS modules
│   │       ├── auth/                  # Login, register, token refresh, OAuth
│   │       ├── posts/                 # Post creation, feeds, reactions, comments
│   │       ├── chat/                  # Messaging controllers, socket gateway
│   │       ├── bookmarks/             # Saved routine items & slot updates
│   │       ├── blood/                 # Blood donation requests & listings
│   │       ├── friends/               # Friend requests & social graph
│   │       ├── notifications/         # User notifications & read states
│   │       ├── duas/                  # Dua directory & search
│   │       ├── categories/            # Topic categories & Dua filters
│   │       ├── users/                 # Profile management & avatars
│   │       └── uploads/               # Cloudinary multi-media uploads
│   │
│   ├── cache/                         # Redis service & fallback cache
│   │   ├── redis.service.ts           # ioredis client manager
│   │   └── cache.service.ts           # Cache get, set, invalidate helpers
│   │
│   ├── kafka/                         # Kafka event bus module
│   │   ├── kafka-producer.service.ts  # Event emission & local dispatch fallback
│   │   └── events/                    # Event definitions (post, audio, share)
│   │
│   ├── workers/                       # Distributed background workers
│   │   ├── post-worker.service.ts     # Post fan-out & indexing consumer
│   │   └── audio-worker.service.ts    # FFmpeg audio extraction consumer
│   │
│   ├── socket/                        # Socket.IO WebSocket server gateway
│   ├── database/                      # Prisma Client singleton & seeders
│   ├── app.ts                         # Express application setup
│   └── server.ts                      # Server bootstrap entry point (port 5000)
│
├── .env.example                       # Environment variables reference template
├── docker-compose.yml                 # Local PostgreSQL & Redis containers
├── Dockerfile                         # Production Docker container build
├── package.json                       # Dependencies & scripts
└── tsconfig.json                      # TypeScript configuration
```

---

## 🗄️ Database Schema (Prisma ORM)

PeaceTweet uses a modern multi-file Prisma schema setup organized inside `prisma/schema/`.

```mermaid
erDiagram
    USER ||--o{ POST : "creates"
    USER ||--o{ SAVED_ITEM : "bookmarks"
    USER ||--o{ COMMENT : "writes"
    USER ||--o{ REACTION : "reacts"
    USER ||--o{ FRIENDSHIP : "has"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ BLOOD_REQUEST : "submits"
    POST ||--o{ COMMENT : "has"
    POST ||--o{ REACTION : "receives"
    POST ||--o{ SAVED_ITEM : "saved_as"
    DUA ||--o{ SAVED_ITEM : "saved_as"
    CATEGORY ||--o{ DUA : "categorizes"
    CHAT_ROOM ||--o{ CHAT_MESSAGE : "contains"
    USER ||--o{ CHAT_MESSAGE : "sends"

    USER {
        string id PK
        string email UK
        string username UK
        string name
        string role "USER | ADMIN | MODERATOR"
        string avatarUrl
        datetime createdAt
    }

    POST {
        string id PK
        string authorId FK
        string content
        enum type "TEXT | DUA | BLOOD_REQUEST"
        string[] mediaUrls
        int likesCount
        int commentsCount
        int sharesCount
    }

    SAVED_ITEM {
        string id PK
        string userId FK
        string postId FK
        string duaId FK
        enum timeSlot "MORNING | NOON | AFTERNOON | EVENING | NIGHT"
    }

    BLOOD_REQUEST {
        string id PK
        string patientName
        enum bloodGroup "A_POS | B_POS | O_POS | AB_POS | etc"
        enum urgency "REGULAR | URGENT"
        string hospitalName
        string contactNumber
    }
```

---

## 📡 API Endpoints Reference

Base URL: `http://localhost:5000/api/v1`

### 🔑 Authentication
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new account | Public |
| `POST` | `/auth/login` | Login with email & password | Public |
| `POST` | `/auth/refresh-token` | Exchange refresh token for new access token | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile | Bearer |

### 📰 Posts & Feed
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/posts` | Paginated feed with category & type filters | Public/Bearer |
| `POST` | `/posts` | Create new post (dispatches to Kafka) | Bearer |
| `POST` | `/posts/:id/reactions` | Toggle like/reaction on a post | Bearer |
| `POST` | `/posts/:id/comments` | Add comment to post | Bearer |
| `POST` | `/posts/:id/shares` | Reshare post (dispatches to Kafka) | Bearer |
| `DELETE`| `/posts/:id` | Delete user post | Bearer |

### 📿 Bookmarks & Saved Routines
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/bookmarks` | Get all saved items or filter by `?timeSlot=MORNING` | Bearer |
| `POST` | `/bookmarks` | Save post or Dua to a routine time slot | Bearer |
| `PATCH`| `/bookmarks/:id/time-slot` | Reassign item to another daily time slot | Bearer |
| `DELETE`| `/bookmarks/:id` | Remove item from saved bookmarks | Bearer |

### 🩸 Blood Donation
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/blood/requests` | List emergency blood donation requests | Public |
| `POST` | `/blood/requests` | Submit urgent blood request | Bearer |

### 💬 Chat & Messages
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/chat/conversations` | List user's active chats with unread counts | Bearer |
| `GET` | `/chat/messages/:chatId` | Fetch message history for a conversation | Bearer |
| `POST` | `/chat/messages` | Send message (also dispatched via Socket.IO) | Bearer |

### 🔔 Notifications
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | List user notifications (All or Unread) | Bearer |
| `PATCH`| `/notifications/read-all`| Mark all notifications as read | Bearer |
| `DELETE`| `/notifications/:id` | Delete notification | Bearer |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have installed:
- **Node.js**: v18.17.0 or higher
- **pnpm**: v8.0.0 or higher (or `npm`)
- **PostgreSQL**: v15 or higher (or cloud provider like Neon)
- **Redis** *(Optional for local, in-memory fallback included)*
- **Apache Kafka** *(Optional for local, local dispatcher included)*

### Installation

1. **Clone repository & navigate to backend directory:**
   ```bash
   cd peacetweet_beckend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   *(See [Environment Configuration](#-environment-configuration) below)*

4. **Generate Prisma Client & run migrations:**
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. **Seed authentic data (Categories, Sources, Sample Duas):**
   ```bash
   pnpm prisma:seed
   ```

6. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Server will start at **http://localhost:5000**.

---

## ⚙️ Environment Configuration

Create a `.env` file in the root of `peacetweet_beckend/`:

```env
PORT=5000
NODE_ENV=development
APP_NAME=PeaceTweet
API_PREFIX=/api/v1

# PostgreSQL Database Connection URL (e.g. Neon or Local)
DATABASE_URL="postgresql://user:password@localhost:5432/peacetweet?schema=public"

# JWT Secrets & Expiry Durations
JWT_ACCESS_SECRET=your_super_secret_access_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Allowed CORS Origins
CORS_ORIGIN=http://localhost:3000

# Redis Cache Connection URL (Optional, in-memory fallback enabled)
REDIS_URL="redis://localhost:6379"

# Apache Kafka Event Streaming (Optional, local fallback enabled)
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=peacetweet-backend
KAFKA_GROUP_ID=peacetweet-workers

# Cloudinary Storage for Multi-media Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Meta (Facebook) OAuth (Optional)
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback
```

---

## 📜 Available Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `pnpm dev` | Starts server with live auto-reload via `tsx watch` on port `5000` |
| `build` | `pnpm build` | Compiles TypeScript into production JavaScript in `dist/` |
| `start:prod` | `pnpm start:prod` | Runs compiled production server |
| `prisma:generate`| `pnpm prisma:generate` | Regenerates Prisma Client types from multi-file schema |
| `prisma:migrate` | `pnpm prisma:migrate` | Executes database migrations in development |
| `prisma:seed` | `pnpm prisma:seed` | Seeds database with categories, sources, and sample content |
| `prisma:studio` | `pnpm prisma:studio` | Launches web-based Prisma GUI database browser |
| `docker:up` | `pnpm docker:up` | Spins up local PostgreSQL and Redis containers |

---

## 📄 License

This project is licensed under the [MIT License](../LICENSE).
