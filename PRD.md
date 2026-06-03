# PRD — Preproute Test Management Application

> **Cursor Instructions:** Read this entire document before generating any code. Implement every screen, flow, and API call exactly as described. Do not deviate from the UI design described below.
>
> **Architecture:** This is a Next.js full-stack app. The frontend calls the external Preproute backend for subjects/topics/questions/tests. MongoDB is used locally to store the authenticated session user and to enable full CRUD on tests as a local cache/layer. JWT issued by our own `/api/auth/login` route is stored in an `httpOnly` cookie and verified by Next.js middleware on every protected route.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| HTTP Client | Axios — one instance for external API, one for internal `/api` routes |
| State | React Context + `useState`/`useReducer` |
| Forms | React Hook Form + Zod |
| Auth | JWT (`jsonwebtoken`) issued by our Next.js API route, stored in `httpOnly` cookie |
| Database | MongoDB via Mongoose — session/user store + local CRUD cache |
| Rich Text | `@tiptap/react` (lightweight, SSR-safe) |
| Toasts | `react-hot-toast` |
| Icons | `lucide-react` |

---

## Architecture Overview

```
Browser
  │
  ├── Next.js App Router (frontend pages)
  │     └── calls /api/* (our own Next.js API routes)
  │
  └── /api/* (Next.js Route Handlers)
        ├── /api/auth/login   → validates with external API → issues our JWT cookie → saves session to MongoDB
        ├── /api/auth/logout  → clears cookie
        ├── /api/auth/me      → returns user from JWT
        └── /api/proxy/*      → JWT-verified proxy to external Preproute backend
              └── forwards requests to https://admin-moderator-backend-staging.up.railway.app/api
                  with the external token stored in MongoDB session
```

**Why proxy?** The external backend token stays on the server. The browser only ever sees our JWT cookie. This also means we can add local MongoDB CRUD (e.g. soft-delete, draft caching) on top.

---

## Environment Variables (`.env.local`)

```bash
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/preproute?retryWrites=true&w=majority

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_64_char_secret_here
JWT_EXPIRES_IN=7d

# External Preproute backend
EXTERNAL_API_BASE=https://admin-moderator-backend-staging.up.railway.app/api

# (Optional) pre-fill on login page during dev
NEXT_PUBLIC_TEST_USER=vedant-admin
NEXT_PUBLIC_TEST_PASS=vedant123
```

---

## Project Structure

```
/app
  /login                    → Page 1: Login
  /dashboard                → Page 2: Test List
  /tests
    /create                 → Page 3: Create Test
    /[id]/edit              → Page 3 (edit mode, modal)
    /[id]/questions         → Page 4: Add Questions
    /[id]/publish           → Page 5: Preview & Publish
  /api
    /auth
      /login/route.ts       → POST: validate → external API → JWT cookie → MongoDB session
      /logout/route.ts      → POST: clear cookie + session
      /me/route.ts          → GET: decode JWT → return user
    /proxy/[...path]/route.ts → ALL: verify JWT → forward to external API

/components
  /ui                       → Button, Input, Select, MultiSelect, Modal, Badge, Spinner, Toast
  /layout                   → Sidebar, Navbar, Breadcrumb, AuthGuard
  /test                     → TestTable, TestCard, TestFormFields, EditTestModal
  /questions                → QuestionEditor, QuestionList, QuestionCard, OptionRow

/lib
  mongodb.ts                → Mongoose connection singleton
  jwt.ts                    → sign / verify helpers
  externalApi.ts            → Axios instance for external API (server-side only)
  clientApi.ts              → Axios instance for our /api/proxy/* (browser-side)

/models
  Session.ts                → Mongoose model: { userId, externalToken, user, createdAt }

/hooks
  useAuth.ts                → reads /api/auth/me, provides user context
  useSubjects.ts
  useTopics.ts
  useSubTopics.ts

/types
  index.ts                  → All shared TypeScript types

/middleware.ts              → Protects all routes except /login using JWT cookie
```

---

## MongoDB Models

### Session Model (`/models/Session.ts`)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  userId: string;
  externalToken: string;   // token from Preproute backend — stored server-side only
  user: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

const SessionSchema = new Schema<ISession>({
  userId:        { type: String, required: true, unique: true },
  externalToken: { type: String, required: true },
  user:          { type: Schema.Types.Mixed, required: true },
  createdAt:     { type: Date, default: Date.now },
  expiresAt:     { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
});

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);
```

> We only need one model. The tests/questions/subjects live in the external backend. MongoDB here handles the auth session so we never expose the external token to the browser.

---

## Auth Layer (JWT + Cookie)

### `lib/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;

export function signToken(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    return jwt.verify(token, SECRET) as jwt.JwtPayload;
  } catch {
    return null;
  }
}
```

### `app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Session from '@/models/Session';
import { signToken } from '@/lib/jwt';
import axios from 'axios';

export async function POST(req: NextRequest) {
  const { userId, password } = await req.json();

  // 1. Authenticate with external Preproute API
  let externalToken: string;
  let user: object;
  try {
    const { data } = await axios.post(
      `${process.env.EXTERNAL_API_BASE}/auth/login`,
      { userId, password }
    );
    if (!data.success) throw new Error(data.message || 'Login failed');
    externalToken = data.data.token;
    user = data.data.user;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.response?.data?.message || 'Invalid credentials' },
      { status: 401 }
    );
  }

  // 2. Upsert session in MongoDB
  await connectMongo();
  await Session.findOneAndUpdate(
    { userId },
    { userId, externalToken, user, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { upsert: true, new: true }
  );

  // 3. Issue our own JWT (contains only userId — no external token)
  const ourToken = signToken({ userId, user });

  // 4. Set httpOnly cookie
  const response = NextResponse.json({ success: true, user });
  response.cookies.set('token', ourToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  return response;
}
```

### `app/api/proxy/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import connectMongo from '@/lib/mongodb';
import Session from '@/models/Session';
import axios from 'axios';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  // 1. Verify our JWT cookie
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });

  // 2. Retrieve external token from MongoDB
  await connectMongo();
  const session = await Session.findOne({ userId: payload.userId });
  if (!session) return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });

  // 3. Forward request to external API
  const externalUrl = `${process.env.EXTERNAL_API_BASE}/${params.path.join('/')}`;
  const searchParams = req.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${externalUrl}?${searchParams}` : externalUrl;

  let body: any = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.json().catch(() => undefined);
  }

  try {
    const { data, status } = await axios({
      method: req.method,
      url: fullUrl,
      data: body,
      headers: { Authorization: `Bearer ${session.externalToken}` },
    });
    return NextResponse.json(data, { status });
  } catch (err: any) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { success: false, message: 'External API error' };
    return NextResponse.json(data, { status });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
```

### `middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const token = request.cookies.get('token')?.value;
  const isValid = token ? !!verifyToken(token) : false;

  if (!isPublic && !isValid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname === '/login' && isValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next/data).*)'],
};
```

---

## Client-side API Instance

```typescript
// lib/clientApi.ts
// Browser-side: calls our own /api/proxy/* — cookie is sent automatically
import axios from 'axios';

const clientApi = axios.create({ baseURL: '/api/proxy' });

clientApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default clientApi;
```

All frontend data fetching uses `clientApi`, not the external URL directly.

---

## TypeScript Types

```typescript
// types/index.ts

export interface User {
  id: string;
  name: string;
  role: string;
}

export interface Subject { id: string; name: string; }
export interface Topic   { id: string; name: string; subject_id: string; }
export interface SubTopic{ id: string; name: string; topic_id: string; }

export type Difficulty  = 'easy' | 'medium' | 'difficult';
export type TestType    = 'chapter_wise' | 'pyq' | 'mock_test';
export type TestStatus  = 'draft' | 'live' | null;

export interface Test {
  id: string;
  name: string;
  type: TestType;
  subject: string;
  topics: string[];
  sub_topics?: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: Difficulty;
  total_time: number;
  total_marks: number;
  total_questions: number;
  status: TestStatus;
  created_at: string;
  questions?: string[];
}

export interface Question {
  id?: string;
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: Difficulty;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id: string;
}

// Zod schemas (define alongside these in types/schemas.ts)
```

---

## Color & Design System

| Token | Value |
|---|---|
| Primary Blue | `#5B6BF5` |
| Sidebar BG | `#1A1A2E` |
| Page BG | `#F7F8FC` |
| Card BG | `#FFFFFF` |
| Border | `#E5E7EB` |
| Text Primary | `#111827` |
| Text Muted | `#6B7280` |
| Success Green | `#10B981` |
| Error Red | `#EF4444` |
| Badge Easy | `bg-[#D1FAE5] text-[#065F46]` |
| Badge Medium | `bg-yellow-100 text-yellow-800` |
| Badge Difficult | `bg-red-100 text-red-800` |
| Font | Inter (Google Fonts) |

Buttons: `rounded-lg`. Primary = blue filled. Secondary = white with border.
Inputs: `rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5B6BF5]`.
Sidebar: dark navy, active item = `border-l-4 border-[#5B6BF5] bg-white/10 text-white`.

---

## Page 1 — Login

![Login Screen](./screen_login.png)

### Layout
Split screen: left half = `bg-[#EEF2FF]` with illustrated mascot SVG. Right half = white card, vertically centered.

Right card contains:
- Preproute logo (styled text: `Prep` in dark, `route` in blue `#5B6BF5`)
- `Login` heading (`text-2xl font-semibold`)
- Subtitle: `Use your company provided Login credentials` (muted)
- `User ID` field
- `Password` field (with eye toggle)
- `Forgot password?` link (blue, non-functional)
- `Login` full-width blue button

### API Flow
```
POST /api/auth/login  { userId, password }
  → server calls external /auth/login
  → stores externalToken in MongoDB Session
  → issues JWT in httpOnly cookie
  → returns { success, user }

On success → redirect to /dashboard
On failure → show red inline error
```

### Validation (Zod)
```typescript
const loginSchema = z.object({
  userId:   z.string().min(1, 'User ID is required'),
  password: z.string().min(1, 'Password is required'),
});
```

---

## Page 2 — Dashboard / Test List

### Layout
- Left sidebar (dark navy, 240px): Logo, nav items with `lucide-react` icons.
  - Dashboard (`LayoutDashboard`)
  - Test Creation (`ClipboardList`) — active on this page
  - Test Tracking (`BarChart2`)
  - Additional icon-only items below a divider (Settings, Bell, etc.)
- Top navbar: bell icon, avatar + `Alex Wando / Admin` + caret dropdown
- Main: `Test Creation` heading, `+ Create New Test` blue button top-right
- Table with columns: Test Name, Subject, Topics, Status, Created At, Actions

### Data Flow
```typescript
// On mount
GET /api/proxy/tests  → render table rows
```

### Table Row Actions
| Action | Behaviour |
|---|---|
| Edit (pencil icon) | Open `EditTestModal` pre-filled with test data |
| Delete (trash icon) | Confirm dialog → `DELETE /api/proxy/tests/:id` → refetch list |
| View (eye icon) | Navigate to `/tests/[id]/publish` |

### Status Badge
- `draft` / `null` → grey pill
- `live` → green pill

### Empty State
Centered illustration + "No tests yet. Create your first test." + `+ Create New Test` button.

---

## Page 3 — Create / Edit Test

### 3A — Create Test (`/tests/create`)

![Create Test Screen](./screen_create_test.png)

Breadcrumb: `Test Creation / Create Test / Chapter Wise`

**Tab bar:** `Chapter Wise` | `PYQ` | `Mock Test`
(Sets `type` field: `chapter_wise` | `pyq` | `mock_test`)

**2-column form grid:**

| Left | Right |
|---|---|
| Subject — `<Select>` fetched from `GET /api/proxy/subjects` | Name of Test — `<Input>` |
| Topic — `<MultiSelect>` fetched from `GET /api/proxy/topics/subject/:id` on subject change | Sub Topic — `<MultiSelect>` fetched from `POST /api/proxy/sub-topics/multi-topics` on topic change |
| Duration (Minutes) — `<Input type="number">` | Test Difficulty Level — `<RadioGroup>` Easy / Medium / Difficult |

**Marking Scheme (full-width row):**
```
Wrong Answer  [-1 ↑↓]   Unattempted [+0 ↑↓]   Correct Answer [+5 ↑↓]   No of Questions [____]   Total Marks [auto, disabled]
```
`Total Marks = No of Questions × Correct Answer` — recalculates live.

**Actions:** `Cancel` (outline) | `Next` (blue)

### Create API Call
```typescript
POST /api/proxy/tests
{
  name, type, subject,     // subject UUID
  topics,                  // string[] of UUIDs
  sub_topics,              // string[] of UUIDs
  correct_marks,
  wrong_marks,             // negative e.g. -1
  unattempt_marks,
  difficulty,
  total_time,              // minutes
  total_marks,
  total_questions,
  status: null
}
→ on success: navigate to /tests/[data.id]/questions
```

### 3B — Edit Test (Modal)

![Edit Test Modal](./screen_edit_modal.png)

Triggered from dashboard Edit action or pencil icon on Pages 4 & 5.
Same form as 3A but inside a modal. Title: `Edit Test creation`. Bottom: `Cancel` | `Save`.

```typescript
PUT /api/proxy/tests/:id  { ...updatedFields }
→ close modal → refetch test data
```

---

## Page 4 — Add Questions (`/tests/[id]/questions`)

![Add Questions Screen](./screen_add_questions.png)

### Layout

**Left panel (280px, collapsible):**
- Header: `Question creation` + `<<` collapse icon
- `Total Questions: N` counter
- Scrollable list of question cards:
  - Green check circle if `question` text is non-empty
  - Label: `Question 1`, `Question 2`, etc.
  - `>` arrow, clicking focuses that question in editor
  - Active = `border-l-4 border-[#5B6BF5]`
- `+ Question` button (adds blank question to local state)
- `+ Chapter` button (visual grouping only)

**Right main panel:**
- Breadcrumb + `Publish` blue button (top-right)
- Test info card (badge, chapter, difficulty, subject, topics pills, subtopic pills, 60 Min / 50 Qs / 250 Marks)
- Pencil edit icon → opens `EditTestModal`
- `Delete All Edits` red text link → clears all local question state
- **Question editor:**
  - Header: `Question 4 (5)` with `← →` arrows
  - `+ MCQ` button | `+ CSV` button (CSV is UI-only placeholder)
  - Tiptap rich text editor (Bold, Italic, Underline, alignment toolbar)
  - `Type the options below` — 4 rows, each: radio circle + text input + delete icon
  - Radio circle = clicking marks that option as `correct_option`
  - `Add Solution` textarea (maps to `explanation`)
  - `Question settings` section:
    - Level of Difficulty dropdown
    - Topic dropdown
    - Sub-topic dropdown
- Bottom bar: `Exit Test Creation` (red) | `Next` (blue)

### State Management

```typescript
// Local state structure for questions page
interface LocalQuestion {
  _localId: string;           // uuid generated client-side
  question: string;           // html string from tiptap
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation: string;
  difficulty: Difficulty | '';
  topic: string;
  sub_topic: string;
  media_url: string;
}

// activeIndex: which question is shown in editor
// questions: LocalQuestion[]
```

### Save Flow (Next button)
```typescript
// 1. Validate — at least 1 question with non-empty question text
// 2. POST /api/proxy/questions/bulk
{
  questions: questions.map(q => ({
    type: 'mcq',
    question: q.question,
    option1: q.option1,
    option2: q.option2,
    option3: q.option3,
    option4: q.option4,
    correct_option: q.correct_option,
    explanation: q.explanation || undefined,
    difficulty: q.difficulty || undefined,
    topic: q.topic || undefined,
    sub_topic: q.sub_topic || undefined,
    test_id: testId
  }))
}
// 3. Get returned question IDs from response
// 4. PUT /api/proxy/tests/:id
{
  questions: returnedIds,
  total_questions: returnedIds.length,
  total_marks: test.correct_marks * returnedIds.length
}
// 5. Navigate to /tests/[id]/publish
```

---

## Page 5 — Preview & Publish (`/tests/[id]/publish`)

![Publish Now Screen](./screen_publish_now.png)
![Schedule Publish Screen](./screen_schedule_publish.png)

### Layout
- Sidebar + Navbar (same as all pages)
- Header: `Test creation`
- Status chip: `Test created ✅ All N Questions done` (green pill)
- Test info card (same as Page 4 card) + pencil edit → `EditTestModal`
- Tab bar: `Publish Now` | `Schedule Publish`

### On Mount
```typescript
// Fetch test
GET /api/proxy/tests/:id → get test.questions (array of IDs)

// Fetch question details
POST /api/proxy/questions/fetchBulk
{ question_ids: test.questions }
→ render questions in preview list
```

### Publish Now Tab
`Live Until` radio options:
- Always Available
- 1 Week
- 2 Weeks
- 3 Weeks
- 1 Month
- Custom Duration → shows date + time pickers

`Cancel` | `Confirm` (blue)

On Confirm:
```typescript
PUT /api/proxy/tests/:id  { status: 'live' }
→ toast success "Test published successfully!"
→ redirect to /dashboard
```

### Schedule Publish Tab
Additional top section: `Select Date and Time` (date picker + time dropdown).
Same `Live Until` options below.
Same confirm behaviour (schedule stored client-side only unless backend supports it).

---

## API Reference

> External base: `https://admin-moderator-backend-staging.up.railway.app/api`
> Accessed via our proxy: `/api/proxy/*`
> The `/` root returns `Route not found` — expected. Use specific endpoints only.

| # | Method | Our Proxy Path | External Path | Purpose |
|---|---|---|---|---|
| 1 | POST | `/api/auth/login` | `/auth/login` | Login (handled by our route) |
| 2 | GET | `/api/proxy/subjects` | `/subjects` | All subjects |
| 3 | GET | `/api/proxy/topics/subject/:id` | `/topics/subject/:id` | Topics by subject |
| 4 | POST | `/api/proxy/sub-topics/multi-topics` | `/sub-topics/multi-topics` | Sub-topics by topic IDs |
| 5 | GET | `/api/proxy/tests` | `/tests` | All tests |
| 6 | POST | `/api/proxy/tests` | `/tests` | Create test |
| 7 | GET | `/api/proxy/tests/:id` | `/tests/:id` | Get test by ID |
| 8 | PUT | `/api/proxy/tests/:id` | `/tests/:id` | Update test / publish |
| 9 | POST | `/api/proxy/questions/bulk` | `/questions/bulk` | Bulk create questions |
| 10 | POST | `/api/proxy/questions/fetchBulk` | `/questions/fetchBulk` | Fetch questions by IDs |

---

## Error Handling Rules

- Every API call wrapped in try/catch with toast on error.
- `clientApi` interceptor: 401 → clear cookie via `POST /api/auth/logout` → redirect `/login`.
- Form errors: inline below each field (React Hook Form `errors` object).
- Loading state: spinner overlay or skeleton on data-fetching pages.
- If `POST /questions/bulk` fails → do NOT navigate, show error, allow retry.
- If test has 0 questions → disable `Next` and `Publish` buttons, show tooltip.

---

## Edge Cases

- Subject dropdown loads on mount. Topics disabled until subject selected. Sub-topics disabled until topics selected.
- Changing subject clears topic and sub-topic selections.
- Changing topics triggers `POST /sub-topics/multi-topics` with all selected topic IDs.
- `wrong_marks` is a negative number stored as-is (e.g. `-1`). Spinner goes down to `-10`, up to `0`.
- `Total Marks` is always read-only and recalculates on `No of Questions` or `Correct Answer` change.
- On the questions page, navigating away (Exit) should warn the user if there are unsaved questions.
- Delete Test: if test is `live`, show warning before deletion.

---

## Component Notes

### `<MultiSelect>`
- Shows selected items as `×` dismissible pills inside the trigger.
- Searchable dropdown below.
- Closes on outside click (`useEffect` + `ref`).

### Spinner Input (Marking Scheme)
- Custom component with `▲ ▼` buttons.
- `wrong_marks`: min `-10`, max `0`.
- `correct_marks`, `unattempt_marks`: min `0`, max `20`.

### `<AuthGuard>` Layout Wrapper
Wraps all protected layouts. Calls `GET /api/auth/me` on mount. If returns 401, redirect to `/login`. Provides user via context.

### Tiptap Editor
Use `@tiptap/react` with `@tiptap/starter-kit`. Dynamic import not needed (tiptap is SSR-safe with `use client`).

---

## Installation & Setup

```bash
# 1. Clone & install
npm install

# 2. Dependencies
npm install mongoose jsonwebtoken @types/jsonwebtoken axios react-hook-form zod @hookform/resolvers @tiptap/react @tiptap/starter-kit react-hot-toast lucide-react

# 3. Set up .env.local (see Environment Variables section above)

# 4. Run dev
npm run dev
```

---

## Submission Checklist

- [ ] `.env.local` configured with `MONGODB_URI` and `JWT_SECRET`
- [ ] Login: external API auth → JWT cookie → MongoDB session stored
- [ ] Middleware protects all routes via httpOnly cookie
- [ ] `/api/proxy/*` correctly forwards requests with external token from MongoDB
- [ ] Dashboard: lists all tests from API, correct status badges
- [ ] Create Test: cascading dropdowns work (subject → topic → sub-topic)
- [ ] Edit modal pre-fills existing test data, PUT on Save
- [ ] Delete test with confirmation dialog
- [ ] Add Questions: left panel tracks count, editor handles all 4 options + correct option
- [ ] Bulk questions POST fires correctly, test updated with returned IDs
- [ ] Publish page fetches question details via fetchBulk
- [ ] Publish Now and Schedule Publish both call PUT with `status: 'live'`
- [ ] Toast notifications on success/error
- [ ] No TypeScript errors in strict mode
- [ ] Responsive: sidebar collapses on mobile
- [ ] README with setup steps, live URL, and tech decisions