# GetSATGo 🎯
### Digital SAT Adaptive Mastery Platform for Teachers & Students

**GetSATGo** is a full-stack Digital SAT preparation product built for teachers to instruct and empower students with authentic exam simulation, real-time analytics, embedded Desmos graphing, and topic-specific drills.

---

## 🚀 Key Features

### 1. 🔐 Authentication & Session / Subscription Validation
- **Secure JWT Auth**: Student and Teacher login/registration with bearer session tokens.
- **Subscription Paywall & Session Validation**: Strict middleware gate (`require_active_subscription`) ensuring students hold an active subscription pass before accessing exams and drills.
- **Trial & Mock Checkout**: Students can activate or simulate subscription renewal or expiration in 1-click.

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

### 6. 👩‍🏫 Teacher Portal, Cohort Inspection & Administrator Feature Controls
- **Cohort Performance Overview**: Cohort average score, total tests completed, and active subscription count.
- **Deep Student Inspection (No Dead Ends)**: Click any student in the roster to view their complete score progression, mock attempts, drill sessions, and toggle/grant their 60-day Pro Pass.
- **Question Authoring Tool**: Teacher interface to create and publish new MCQ and SPR questions to the question bank.
- **Administrator Dynamic Feature Controls**:
  - **Exam & Timer**: Customize default test duration, enable/disable countdown hiding, set time trap pace thresholds (e.g., 90s vs 120s), toggle question flagging and MCQ option strikethrough.
  - **Calculators & Aids**: Dynamically enable or disable the embedded Desmos graphing calculator and math formula sheet.
  - **Access & Paywalls**: Configure whether mock tests and/or drills require a paid pass, adjust the displayed monthly subscription price, and configure free trial durations.
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
| `/teacher` | **Instructor Hub** | Student roster inspection, question creator, and admin settings controls |
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
# From repository root:
source venv/bin/activate
uvicorn app.main:app --app-dir backend --reload --port 8000
```
- Interactive Swagger API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup
```bash
# In another terminal:
cd frontend
npm run dev
```
- Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 👥 Demo Logins (Pre-seeded)

| Role | Email | Password | Features |
|---|---|---|---|
| **Student** | `student@getsatgo.com` | `student123` | Active Pro Pass, historical analytics, full test taking |
| **Teacher** | `teacher@getsatgo.com` | `teacher123` | Educator privileges, cohort analytics, question creator |

