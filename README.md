# Tuk-Tuk Sales Management System (MVP)

A full-stack MVP for an e-mobility company that digitizes the Tuk-Tuk sales
workflow — from customer inquiry to vehicle handover.

## Tech Stack

**Frontend**
- React 19 + Vite
- React Router
- TailwindCSS
- React Hook Form + Yup
- Framer Motion
- React Hot Toast
- Recharts
- React Icons
- Day.js

**Backend (Firebase)**
- Firebase Realtime Database
- Firebase Authentication
- Firebase Storage (vehicle images, credit documents)
- Security rules (database + storage)

**Deployment**
- Firebase Hosting

## Project Structure

```
sales/
├── backend/                  # Firebase rules + seed script
│   ├── database.rules.json
│   ├── storage.rules
│   └── seed-admin.js
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layouts/          # AppLayout, Sidebar, Topbar
│   │   └── ui/               # Reusable UI (Card, Modal, Badge, etc.)
│   ├── constants/            # Roles, statuses, navigation
│   ├── contexts/             # AuthContext (React Context API)
│   ├── firebase/             # Firebase config
│   ├── hooks/                # useAsync, useDashboardData
│   ├── pages/                # All route pages
│   ├── routes/               # ProtectedRoute (role-based)
│   ├── services/             # Firebase data services (CRUD per entity)
│   ├── styles/               # Tailwind + global CSS
│   └── utils/                # Helpers, permissions
├── .env.example
├── firebase.json
└── package.json
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
1. Create a project at https://console.firebase.google.com
2. Enable **Authentication** → Email/Password provider
3. Create a **Realtime Database** (start in test mode, then deploy rules)
4. Enable **Storage**
5. Copy `.env.example` to `.env` and fill in your Firebase credentials:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Deploy security rules
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only database,storage
```

### 4. Seed the admin user
```bash
node backend/seed-admin.js
```
Default credentials:
- Email: `admin@tuktuk.com`
- Password: `Admin@12345`

> Change the password after first login.

### 5. Run the dev server
```bash
npm run dev
```
Visit http://localhost:5173

### 6. Build & deploy
```bash
npm run build
firebase deploy --only hosting
```

## Features

### Authentication & Roles
- Email/password login, password reset
- Role-based route protection
- Roles: Admin, Sales Agent, Finance Officer, Workshop Officer, NTSA Officer, Dispatch Officer
- Only Admins can create/deactivate users, reset passwords, assign roles

### Modules
- **Dashboard** — KPI cards, sales chart, inquiry conversion pie, vehicle stock bar, recent activity
- **Customers** — CRUD, search, pagination, customer detail with inquiries & sales
- **Inquiries** — Create, assign vehicle/agent, update status, timeline, convert to sale
- **Sales** — Cash & Credit workflow, payment recording, receipt printing, credit applications with document upload
- **Inventory** — CRUD, status filter, image upload (Firebase Storage), vehicle profile
- **Workshop** — Job cards auto-created on payment confirmation, inspection checklist, status tracking
- **NTSA** — Application/inspection/ownership/logbook tracking, auto-created on payment confirmation
- **Dispatch** — Validates payment + workshop + NTSA all complete before enabling handover; completes sale & marks vehicle delivered
- **Reports** — Sales, Customer, Inventory, Workshop, Dispatch reports; CSV + PDF export
- **Users** — Admin-only user management

### Workflow Logic
```
Customer → Inquiry → Convert to Sale → Choose Payment
  ├─ Cash  → Record Payment → Confirm → Reserve Vehicle → Workshop + NTSA
  └─ Credit → Credit Application → Approve → Disburse → Reserve → Workshop + NTSA
Workshop & NTSA run in parallel → both complete → Ready for Dispatch
Dispatch validates all → Handover → Sale Completed, Vehicle Delivered
```

## License
MIT — MVP for demonstration purposes.
