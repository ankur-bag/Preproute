# Copilot Instructions — Preproute Test Management Application

Read this file completely before writing any code. These rules are non-negotiable and apply to every file in this project.

---

## Project Overview

A Next.js 14+ full-stack test management application for Preproute. Users log in, create tests, add MCQ questions, and publish them. The app uses our own JWT-based auth (httpOnly cookie) as a layer on top of the external Preproute backend. MongoDB stores auth sessions only. All test/question data lives in the external API.

---

## Tech Stack

- Next.js 14+ with App Router
- TypeScript (strict mode — no `any` unless absolutely unavoidable, always annotate)
- Tailwind CSS (utility-first, no inline styles)
- Axios (two instances: `lib/clientApi.ts` for browser, `lib/externalApi.ts` for server)
- React Hook Form + Zod (all forms)
- Mongoose + MongoDB (session storage only)
- `jsonwebtoken` for JWT sign/verify
- `@tiptap/react` + `@tiptap/starter-kit` for the question rich text editor
- `react-hot-toast` for all notifications
- `lucide-react` for all icons — no other icon libraries

---

## Absolute UI Rules — Never Break These

### No bold text anywhere in the application
- Never use `font-bold`, `font-semibold`, `font-medium`, or `font-black` on any element
- Never use `<strong>` or `<b>` tags
- Headings use `font-normal` or at most `font-[450]` with larger `text-` size for visual hierarchy
- Labels, table headers, card titles — all `font-normal`
- This applies to every component, every page, every state (loading, error, empty, filled)

### Every clickable element must have `cursor-pointer`
- All `<button>` elements: always include `cursor-pointer` in className
- All `<a>` tags: always include `cursor-pointer`
- All `onClick` handlers on `<div>`, `<span>`, `<li>`, `<tr>`, etc.: always include `cursor-pointer`
- Dropdown triggers, modal close buttons, tab items, sidebar nav items, icon buttons, radio labels, checkbox labels — all `cursor-pointer`
- Disabled buttons: use `cursor-not-allowed opacity-50` instead
- Never leave an interactive element without an explicit cursor class

### Design tokens — use these exact values
```
Primary Blue:    #5B6BF5
Sidebar BG:      #1A1A2E
Page BG:         #F7F8FC
Card BG:         #FFFFFF
Border:          #E5E7EB
Text Primary:    #111827
Text Muted:      #6B7280
Success Green:   #10B981
Error Red:       #EF4444
Badge Easy:      bg-[#D1FAE5] text-[#065F46]
Badge Medium:    bg-yellow-100 text-yellow-800
Badge Difficult: bg-red-100 text-red-800
```

### Typography
- Font: Inter (loaded via `next/font/google`)
- All text is `font-normal` — no exceptions
- Size hierarchy: page titles `text-xl`, section headers `text-base`, body `text-sm`, muted labels `text-xs`
- Never use Tailwind's default heading styles (`prose`, `h1`-`h6` with bold) without overriding font weight to normal

### Component style rules
- All buttons: `rounded-lg`, never `rounded-full` unless it's a pill badge
- All inputs: `rounded-lg border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#5B6BF5]`
- All cards: `bg-white rounded-xl border border-[#E5E7EB]`
- Sidebar active item: `border-l-4 border-[#5B6BF5] bg-white/10 text-white`
- Pills/badges: `rounded-full px-2.5 py-0.5 text-xs font-normal`

---

## Project File Structure

Follow this structure exactly. Do not add files outside of it without a clear reason.

```
/app
  /login/page.tsx
  /dashboard/page.tsx
  /tests
    /create/page.tsx
    /[id]/edit/page.tsx
    /[id]/questions/page.tsx
    /[id]/publish/page.tsx
  /api
    /auth
      /login/route.ts
      /logout/route.ts
      /me/route.ts
    /proxy/[...path]/route.ts
  layout.tsx                  ← root layout, loads Inter font, Toaster
  globals.css

/components
  /ui
    Button.tsx
    Input.tsx
    Select.tsx
    MultiSelect.tsx
    Modal.tsx
    Badge.tsx
    Spinner.tsx
    SpinnerInput.tsx          ← ▲▼ number input for marking scheme
    RadioGroup.tsx
  /layout
    Sidebar.tsx
    Navbar.tsx
    Breadcrumb.tsx
    AuthGuard.tsx             ← wraps protected layouts, calls /api/auth/me
  /test
    TestTable.tsx
    TestFormFields.tsx        ← shared form used in create page and edit modal
    EditTestModal.tsx
  /questions
    QuestionEditor.tsx
    QuestionList.tsx
    QuestionCard.tsx
    OptionRow.tsx

/lib
  mongodb.ts                  ← Mongoose connection singleton
  jwt.ts                      ← signToken / verifyToken
  clientApi.ts                ← Axios for browser (calls /api/proxy/*)
  externalApi.ts              ← Axios for server-side (calls external backend directly, server only)

/models
  Session.ts                  ← Mongoose model

/hooks
  useAuth.ts
  useSubjects.ts
  useTopics.ts
  useSubTopics.ts

/types
  index.ts
  schemas.ts                  ← all Zod schemas

/middleware.ts
```

---

## Auth Architecture

Never expose the external Preproute token to the browser. The flow is:

```
Browser
  POST /api/auth/login { userId, password }
    → our route calls external /auth/login
    → stores { userId, externalToken, user } in MongoDB Session
    → signs our JWT with { userId, user }
    → sets httpOnly cookie "token"
    → returns { success, user }

All data requests from browser:
  GET/POST/PUT /api/proxy/* (with cookie sent automatically)
    → middleware verifies cookie JWT
    → proxy route reads externalToken from MongoDB
    → forwards request to external backend with Authorization: Bearer <externalToken>
    → returns response to browser
```

### JWT rules
- Secret from `process.env.JWT_SECRET` — never hardcode
- Expiry: `process.env.JWT_EXPIRES_IN` (default `7d`)
- Cookie flags: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`, `path: '/'`
- Middleware reads cookie named `token`, calls `verifyToken`, redirects to `/login` on failure
- `/login` and `/api/auth/*` are public — all other routes are protected

---

## MongoDB / Mongoose Rules

- One model only: `Session` — do not add models for tests or questions (those live in external API)
- Always use the connection singleton in `lib/mongodb.ts` — never create a new connection inline
- Session schema must have a TTL index on `expiresAt` (`expireAfterSeconds: 0`)
- Never log `externalToken` to console

```typescript
// lib/mongodb.ts pattern
import mongoose from 'mongoose';
const MONGODB_URI = process.env.MONGODB_URI!;
let cached = (global as any).mongoose || { conn: null, promise: null };
export default async function connectMongo() {
  if (cached.conn) return cached.conn;
  cached.promise = cached.promise || mongoose.connect(MONGODB_URI);
  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## API Routes

### Internal Next.js routes (app/api/)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | No | External login → JWT cookie → MongoDB |
| `/api/auth/logout` | POST | No | Clear cookie + delete MongoDB session |
| `/api/auth/me` | GET | Cookie JWT | Return decoded user |
| `/api/proxy/[...path]` | ALL | Cookie JWT | Proxy to external backend |

### External Preproute backend (accessed via proxy)

Base: `https://admin-moderator-backend-staging.up.railway.app/api`

| Proxy path | External path | Method | Purpose |
|---|---|---|---|
| `/api/proxy/subjects` | `/subjects` | GET | All subjects |
| `/api/proxy/topics/subject/:id` | `/topics/subject/:id` | GET | Topics by subject |
| `/api/proxy/sub-topics/multi-topics` | `/sub-topics/multi-topics` | POST | Sub-topics by topic IDs |
| `/api/proxy/tests` | `/tests` | GET | All tests |
| `/api/proxy/tests` | `/tests` | POST | Create test |
| `/api/proxy/tests/:id` | `/tests/:id` | GET | Get test by ID |
| `/api/proxy/tests/:id` | `/tests/:id` | PUT | Update / publish test |
| `/api/proxy/questions/bulk` | `/questions/bulk` | POST | Bulk create questions |
| `/api/proxy/questions/fetchBulk` | `/questions/fetchBulk` | POST | Fetch questions by IDs |

> The root `/api` returns `{"status":"error","message":"Route not found"}` — this is expected, not a bug.

---

## TypeScript Rules

- Strict mode on — no implicit `any`
- All props interfaces named `[Component]Props`
- All API response shapes typed — no casting to `any`
- Use `unknown` + type narrowing for try/catch error handling:
  ```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Something went wrong';
  }
  ```
- Zod schemas live in `types/schemas.ts`, inferred types via `z.infer<typeof schema>`

---

## Data Fetching Patterns

### Client components (browser)
```typescript
import clientApi from '@/lib/clientApi';

// GET
const { data } = await clientApi.get('/subjects');

// POST
const { data } = await clientApi.post('/tests', payload);

// PUT
const { data } = await clientApi.put(`/tests/${id}`, payload);
```

### Server-side (Route Handlers only)
```typescript
import externalApi from '@/lib/externalApi';
// externalApi has baseURL = EXTERNAL_API_BASE
// manually set Authorization header with externalToken from MongoDB
```

Never import `externalApi` in client components or pages — server only.

---

## Forms

- Use React Hook Form + Zod resolver for every form
- Register all fields — no uncontrolled inputs
- Show errors inline below the field: `<p className="text-xs text-[#EF4444] mt-1">{error.message}</p>`
- Required field labels: append `*` in muted color, never bold
- Disable submit button while loading: `disabled={isSubmitting}` + `cursor-not-allowed opacity-50`

---

## Cascading Dropdowns (Create/Edit Test Form)

Follow this exact dependency chain:

```
Subject selected
  → clear topics + sub-topics
  → fetch GET /api/proxy/topics/subject/:subjectId
  → enable Topic dropdown

Topics changed (one or more selected)
  → clear sub-topics
  → fetch POST /api/proxy/sub-topics/multi-topics { topicIds: [...] }
  → enable Sub-topic MultiSelect

Subject cleared
  → clear and disable both Topic and Sub-topic
```

---

## Question State (Page 4)

All questions are managed in local React state until the user clicks Next. Nothing is saved to any DB mid-session.

```typescript
interface LocalQuestion {
  _localId: string;                 // nanoid() — client-side only, never sent to API
  question: string;                 // HTML string from Tiptap
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation: string;
  difficulty: 'easy' | 'medium' | 'difficult' | '';
  topic: string;
  sub_topic: string;
  media_url: string;
}
```

Save flow on Next click:
1. Validate at least 1 question with non-empty `question` field
2. `POST /api/proxy/questions/bulk` with all questions mapped (strip `_localId`, add `type: 'mcq'`, `test_id`)
3. `PUT /api/proxy/tests/:id` with `{ questions: returnedIds, total_questions, total_marks }`
4. Navigate to `/tests/[id]/publish`

---

## Marking Scheme — Total Marks Calculation

```typescript
// Recalculate on every change to noOfQuestions or correct_marks
const totalMarks = noOfQuestions * correct_marks;
```

`Total Marks` input is always `readOnly` and `disabled`. Never let the user edit it directly.

---

## Notifications

Use `react-hot-toast` for all feedback:

```typescript
import toast from 'react-hot-toast';

toast.success('Test published successfully!');
toast.error('Failed to save. Please try again.');
```

Place `<Toaster position="top-right" />` in the root `layout.tsx`.

---

## Loading & Error States

- Every page that fetches data on mount shows a centered `<Spinner />` while loading
- Every form submit shows a spinner inside the button: replace button text with `<Spinner size="sm" />`
- Empty dashboard state: friendly illustration SVG + message + CTA button
- If an API call fails: `toast.error(message)` + log to console, do not crash the page

---

## Sidebar Navigation

```typescript
const navItems = [
  { label: 'Dashboard',      href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Test Creation',  href: '/tests/create',     icon: ClipboardList   },
  { label: 'Test Tracking',  href: '/dashboard',        icon: BarChart2       },
];
```

Active state: compare `pathname` (from `usePathname()`) with `href`.
Active class: `border-l-4 border-[#5B6BF5] bg-white/10 text-white cursor-pointer`
Inactive class: `text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer`
All nav items: `cursor-pointer`

---

## Publish Page

Two tabs: `Publish Now` and `Schedule Publish`.

### Live Until options
```typescript
const liveUntilOptions = [
  { label: 'Always Available', value: 'always' },
  { label: '1 Week',           value: '1w'     },
  { label: '2 Weeks',          value: '2w'     },
  { label: '3 Weeks',          value: '3w'     },
  { label: '1 Month',          value: '1m'     },
  { label: 'Custom Duration',  value: 'custom' },
];
```

When `Custom Duration` selected: show date picker + time dropdown inputs.
When `Schedule Publish` tab active: show additional `Select Date and Time` row above `Live Until`.

On Confirm:
```typescript
PUT /api/proxy/tests/:id  { status: 'live' }
toast.success('Test published successfully!')
router.push('/dashboard')
```

---

## Environment Variables

```bash
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
EXTERNAL_API_BASE=https://admin-moderator-backend-staging.up.railway.app/api
NEXT_PUBLIC_TEST_USER=vedant-admin
NEXT_PUBLIC_TEST_PASS=vedant123
```

Never access `MONGODB_URI`, `JWT_SECRET`, or `EXTERNAL_API_BASE` in client components — server/route handlers only.

---

## Code Style

- No `console.log` in production code — use `console.error` only in catch blocks
- No commented-out code blocks
- Prefer named exports over default exports for components (default export only for pages)
- One component per file
- Props destructured in function signature
- No inline `style={{}}` — Tailwind only
- All `useEffect` dependencies must be complete — no eslint-disable comments
- Use `useCallback` for handlers passed as props to child components
- All async functions in event handlers wrapped in try/catch

---

## Checklist Before Committing

- [ ] No `font-bold`, `font-semibold`, `font-medium` anywhere
- [ ] Every button, link, clickable div has `cursor-pointer`
- [ ] Every disabled interactive element has `cursor-not-allowed opacity-50`
- [ ] No `localStorage` usage — auth is cookie-based
- [ ] No external token exposed to browser
- [ ] All forms use React Hook Form + Zod
- [ ] All icons from `lucide-react` only
- [ ] No inline styles
- [ ] TypeScript strict — no implicit `any`
- [ ] `connectMongo()` called before every Mongoose operation in route handlers