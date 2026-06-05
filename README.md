# Preproute Test Management Application

A full-stack Next.js application built using TypeScript and Tailwind CSS to manage chapter tests, PYQs, and full mock tests.

## Key Features

1. **Authentication Gate:** Full route protection via httpOnly session cookies and JWT middleware.
2. **Cascading Dropdowns:** Dynamically queries subjects, topics, and subtopics during test creation and question settings.
3. **Marking Scheme Customization:** Numeric spinners that restrict marks (e.g. negative wrong answers) and recalculate totals live.
4. **WYSIWYG Question Editor:** Integrated Tiptap editor with rich formatting commands, option toggles, explanations, and settings.
5. **Preview & Publish Flow:** Allows moderators to preview the full question set and set published durations (now or scheduled).
6. **Robust Dual-Mode Mock Fallback:** If the external Preproute backend is offline, the application seamlessly proxies data fetching to a local MongoDB (or in-process memory singleton) seeded with realistic subjects/topics.

---

## Getting Started

### 1. Configure Environment (`.env.local`)

Create a `.env.local` file at the root of the project:

```bash
# JWT Config
JWT_SECRET=preproute_default_jwt_signing_secret_64_characters_long_for_dev_mode
JWT_EXPIRES_IN=7d

# External Backend API base
EXTERNAL_API_BASE=https://admin-moderator-backend-staging.up.railway.app/api

# Local Database Config (Optional fallback)
# MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/preproute
```

*Note: If `MONGODB_URI` is omitted or database connection fails, the application automatically defaults to process-level memory storage for sessions, tests, and questions. No configuration is strictly required to test.*

### 2. Install & Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Log In

Open [http://localhost:3000](http://localhost:3000) and log in with the company moderator credentials:
- **User ID:** `vedant-admin`
- **Password:** `vedant123`

---

## Technical Architecture

- **Client API Wrapper:** Browser components query `/api/proxy/*` using `clientApi` which automatically appends secure cookies.
- **Server API Proxy:** Route handlers inside `/app/api/proxy/[...path]/route.ts` decrypt the cookies, retrieve the corresponding external token, and forward queries to the external server. If that request fails, the proxy falls back to `dbController` to serve/mutate local data.
- **Edge Middleware:** Edge-compatible JWT parser to protect `/dashboard` and `/tests` folders from unauthorized access.
