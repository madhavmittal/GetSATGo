# GetSATGo 🎯
### Digital SAT Adaptive Mastery Platform for Teachers & Students

**GetSATGo** is a full-stack Digital SAT preparation product built for teachers to instruct and empower students with authentic exam simulation, real-time analytics, embedded Desmos graphing, and topic-specific drills.

---

## 🚀 Key Features

### 1. 🔐 Accounts & Approval
- **Account registration and sign-in**: Password-hashed accounts with JWT sessions; new registrations wait for administrator approval.
- **Administrator approval queue**: The owner reviews and approves or rejects student and teacher requests in the Instructor Hub.
- **Free access after approval**: Approved users can use the full practice platform without a payment gateway.
- **No demo accounts or simulated checkout**: Startup seeds practice content only, never users or historical student activity.

### 2. 📊 Student Analytics Dashboard
- **Estimated SAT Scaled Score**: Predicts score based on recent mock attempts against a target (e.g. 1500+).
- **Core KPI Metrics**: Total mock exams taken, drill sessions, questions solved, overall accuracy %, and average pace per question (vs. standard SAT target of 75s).
- **Syllabus Topic Mastery**: Visual breakdown of accuracy and timing across key syllabus areas (*Algebra*, *Advanced Math*, *Problem-Solving & Data Analysis*, *Geometry & Trigonometry*, *Craft & Structure*, *Information & Ideas*).
- **Automated Weak Area Detection**: Identifies low-accuracy or high-duration topics and recommends targeted drills.
- **Session-wise History**: Complete log of every mock test and drill session with direct review links.

### 3. ⏱️ Official Digital SAT Exam Runner (Bluebook Simulator)
- **Live Timing**: Shows elapsed time and remaining countdown with show/hide toggle.
- **Toggleable Desmos Graphing Calculator**: Built-in official SAT-approved Desmos calculator that students can open, minimize, and move alongside questions.
- **Dual Question Formats**:
  - **4-Option MCQ**: With signature option elimination / strike-through mode.
  - **Student-Produced Response (SPR)**: Accepts numeric floats, decimals (`3.5`, `0.75`), or fractions (`7/2`).
- **Review Navigator**: Question grid with answered indicators and "Flag for Review" bookmarking.
- **Formula Reference Sheet**: Quick access to official SAT math geometric formulas.

### 4. 📈 Post-Test Results & Per-Question Time Analysis
- **Scaled Score**: Real-time conversion to official SAT 200–800 section scaled score with confetti celebration.
- **Section-Wise Breakdown**: Detailed table with scores, percentages, and time spent per section.
- **Granular Question-by-Question Analysis**:
  - Exact time spent on every question.
  - "⚡ Fast", "✓ Good pace", and "⚠️ Time Trap" (>90s) pacing alerts.
  - Student answer vs. correct answer comparison.
  - Step-by-step teacher explanations and SAT strategy tips.

### 5. 🎯 Syllabus Drill Practice Mode
- **Multi-Level Filtering**: Filter questions by Domain (Math, Reading & Writing), Syllabus Topic (*Algebra, Trig, Geometry, Advanced Math*), and Difficulty (*Easy, Medium, Hard*).
- **Active Drill Engine**: Practice with live timer and Desmos calculator support.
- **Instant Feedback**: Immediate scoring and step-by-step solutions that feed back into the student's dashboard analytics.

### 6. 👩‍🏫 Teacher Portal, Cohort Inspection & Administrator Controls
- **Cohort Performance Overview**: Cohort average score and total tests completed.
- **Deep Student Inspection**: Click any student in the roster to view their complete score progression, mock attempts, and drill sessions.
- **Administrator Approval Queue**: Review, approve, or reject new account requests in-app.
- **Question Authoring Tool**: Teacher interface to create and publish new MCQ and SPR questions to the question bank.
- **Administrator Dynamic Feature Controls**:
  - **Exam & Timer**: Customize default test duration, enable/disable countdown hiding, set time trap pace thresholds (e.g., 90s vs 120s), toggle question flagging and MCQ option strikethrough.
  - **Calculators & Aids**: Dynamically enable or disable the embedded Desmos graphing calculator and math formula sheet.
  - **Drill Settings**: Configure default questions per drill session.
  - **One-Click Actions**: "Save Changes" applies updates site-wide; "Restore Defaults" resets to factory presets.

---

## 🗺️ Navigation Map (React Router v7)

| Path | Screen | Description |
|---|---|---|
| `/dashboard` | **Student Dashboard** | High-level analytics, score gauge, topic mastery bars, session history |
| `/tests` | **Mock Tests Catalog** | Official format mock test listing with previous best scores |
| `/tests/:testId` | **Digital SAT Exam Runner** | Full-screen timed simulator with Desmos, SPR/MCQ, and safe Exit button |
| `/results/:attemptId` | **Official Score Report** | Scaled 200–800 score, section accuracy, per-question pacing & explanations |
| `/drills` | **Syllabus Drill Studio** | Topic & difficulty practice with deep linking (`?topic=...&difficulty=...`) |
| `/teacher` | **Instructor Hub** | Student roster, question authoring, admin settings, and account approvals |
| `*` | **404 Not Found Page** | Graceful fallback with direct "Back to Dashboard" navigation (no dead ends) |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, ShadCN-inspired UI components, Lucide Icons, Canvas Confetti.
- **Backend**: Python 3.13, FastAPI (REST API), SQLAlchemy 2.0, SQLite (easily portable to PostgreSQL), Pydantic v2, PyJWT, Bcrypt.
- **Calculator**: Desmos Graphing Calculator API v1.9.

---

## 🏁 Quickstart Guide

### 1. Backend Setup
```bash
# From repository root, create a local environment file and set a unique SECRET_KEY:
cp .env.example .env
# Then load the values into the shell:
set -a && source .env && set +a
source venv/bin/activate
uvicorn app.main:app --app-dir backend --reload --port 8000
```
- Interactive Swagger API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup
```bash
# In another terminal:
cd frontend
# Optional: add VITE_MIXPANEL_TOKEN to frontend/.env.local
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚙️ Production Configuration

- **Secrets and origins**: Set a unique `SECRET_KEY` (at least 32 characters), a strong `POSTGRES_PASSWORD`, `ENVIRONMENT=production`, `CORS_ORIGINS` (comma-separated trusted browser origins), and the public `FRONTEND_URL`. Docker Compose requires these values; do not deploy the example values.
- **Administrator bootstrap**: Set `SUPERUSER_EMAIL` and a strong `SUPERUSER_PASSWORD` for the first production startup. The password must be at least 12 characters and no more than 72 UTF-8 bytes. Once the administrator is created, remove the password variable; startup will preserve the existing admin account. Public registration cannot grant admin privileges.
- **Teacher onboarding**: Set `TEACHER_SIGNUP_CODE` to enable teacher registration. Share it only with trusted educators; leaving it empty disables teacher sign-up.
- **Google sign-in**: Create a Google OAuth client of type **Web application**, add your production URL and `http://localhost:5173` as authorized JavaScript origins, and set its client ID as `GOOGLE_CLIENT_ID`. Docker builds pass this ID to the frontend; local Vite development also needs `VITE_GOOGLE_CLIENT_ID` in `frontend/.env.local`. Google-verified accounts are required for new registrations; new accounts remain pending administrator approval. Existing password sign-ins continue to work. No OAuth client secret or redirect URI is used.
- **Mixpanel**: Set `VITE_MIXPANEL_TOKEN` in `frontend/.env.local` for local development. Docker builds accept the same project token as `MIXPANEL_PROJECT_TOKEN`; hosted frontend builds need `VITE_MIXPANEL_TOKEN` in project environment settings. Use the Mixpanel project token, not the numeric project ID. The app records `page_view` on page loads and client-side route changes, plus successful login, registration-request, and logout events. It has no heartbeat or autocapture and does not send email, names, or passwords.
- **Docker deployment**: Copy `.env.example`, replace the placeholder secrets, set `FRONTEND_URL` to the public app URL, then run `docker compose up --build`. For local Compose, use `http://localhost:8000` as `FRONTEND_URL`; for Vite development, use `http://localhost:5173`.
- **Railway**: Use the Dockerfile builder with `/Dockerfile`. Set `GOOGLE_CLIENT_ID` for the backend and frontend build; set `MIXPANEL_PROJECT_TOKEN` for the frontend build.
The database seeds practice questions and mock tests for a fresh installation. Users register through the app; no pre-defined accounts or sample performance records are created.

