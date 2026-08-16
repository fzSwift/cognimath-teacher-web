# Cognimath teacher web

Vite + React staff desk for the CogniMath classroom pilot. Teachers sign in, see **their classes only**, post classwork / term quizzes, and watch live totals after a student finishes a quiz.

Student app (Expo): [cognimath-app](https://github.com/fzSwift/cognimath-app). Same Supabase project. Schema, RLS, and `submit_session` live in that repo — this app is read/teacher-RPC only.

This dashboard is **not** a student surface. There is no sign-up. A student JWT that reaches this UI is signed out unless `profiles.role = 'teacher'`.

## What this repo is

- Login → class dashboard (today / groups / questions / assignments / pilot study)
- Live numbers from `student_totals` + bounded `concept_struggles` (not raw session dumps)
- Realtime: a 400ms-debounced refetch on `sessions` / `concept_struggles` / `profiles` — events are not streamed into state
- Groups: `create_group`, `assign_to_group`, students join from the Expo app with a 6-character code
- **Pilot study** tab is hardcoded sample data (`src/demo.js`). It never writes to the database.

## Requirements

- Node 22
- npm
- A teacher account on the shared Supabase project (see below)
- Schema already applied from cognimath-app `supabase/schema.sql`

## Run

```powershell
cd teacher-web
npm install
npm run dev
```

Opens http://localhost:5173 (bind `host: true`, so phones on the LAN can hit it).

```powershell
npm run build      # vite build + CSS inline
npm run preview    # local production server (often :4173)
```

Do not leave an old `vite preview` on 4173 if you meant to serve something else — it fails silently when the port is taken.

## Cloud

`src/config.js` holds `SUPABASE_URL` and the public anon / publishable key. Same values as cognimath-app `src/config.js`. Change them together. Never put `service_role` here.

`.env` is gitignored. Runtime reads `src/config.js`. `.env.example` is only a reminder of the public vars.

If login says tables are missing: the SQL Editor has not been run (or PostgREST’s cache is still stale — wait ~30–60s and retry). Paste and run **cognimath-app** `supabase/schema.sql`. This repo has no schema file.

### Provision a teacher

The apps cannot set `role = 'teacher'`.

1. Supabase → Authentication → Add user.
2. SQL Editor:

```sql
update public.profiles set role = 'teacher' where id = '<auth-user-uuid>';
```

3. Sign in here with that email/password. Student emails are rejected after the profile read.

Email confirmation is off on this project.

## How live data works

1. Student finishes a quiz → Expo calls `submit_session` (scores computed in Postgres).
2. Realtime notifies this dashboard (`teacher-dashboard` channel).
3. `subscribeClassChanges` waits 400ms, then `fetchClassData(groupId)` reloads the aggregate view.
4. Overlapping fetches use a loading + rerun ref: a mid-flight event re-runs; a stale response cannot overwrite a newer one.

Manual refresh is the fallback if Realtime is disabled on the project.

Teachers only see students in **their** groups (`private.is_teacher_of_student`). Students can read classmates’ **profiles** (class leaderboard) but not other students’ sessions.

## Lockstep with the student app

Edit both copies in the same sitting. There is no shared package yet.

| Concern | This repo | Student app |
|---|---|---|
| Input rules | `src/lib/validate.js` | `src/lib/validate.js` |
| Live aggregators | `src/api.js` (`aggregateLiveStudents`, `aggregateLiveStruggles`, `fetchClassData`) | `src/core/sync.js` |
| Concept labels / pilot rows | `src/demo.js` | `src/core/tutor.js`, `src/core/data.js` |
| `student_totals` columns | selected in `fetchClassData` | selected in `fetchTeacherLive` |
| Groups RPCs | `src/api.js`, `GroupsCard`, `App.jsx` | `sync.js`, Profile, Leaderboard, LiveClassCard |
| Scoring | do not reimplement | `engine.js` + `submit_session` + `parity-test` |

If you add a column to `student_totals`, select and render it in **both** apps. Keep the view `security_invoker` so RLS still applies.

## Layout

| Path | What |
|---|---|
| `src/App.jsx` | Teacher login (no signup) |
| `src/Dashboard.jsx` | Tabs + live refetch |
| `src/api.js` | Auth, class fetch, groups, assignments, realtime |
| `src/demo.js` | Sample class for the Pilot study tab |
| `src/lib/validate.js` | Same rules as the student app |
| `vite.config.js` | Port 5173, security headers, vendor split |

## Honest status

Classroom desk for a pilot. Fine for a teacher laptop on the school LAN. Not a multi-tenant SaaS: one Supabase project, teachers provisioned by SQL, no self-serve staff signup.
