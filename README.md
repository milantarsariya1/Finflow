# Finflow — Surplus Flow Engine & AI Advisor

Finflow is a high-fidelity personal finance management and investment advisory web application. It tracks user incomes and variable expenditures, computes real surplus cash flow, and offers data-driven, educational guidance on emergency funds, fixed deposits, and mutual funds (SIP) accompanied by warm, natural-language AI insights powered by Groq.

> [!WARNING]
> **EDUCATIONAL USE ONLY**: All projections, simulations, calculations, and AI feedback are for educational purposes only. They do not constitute formal investment, legal, or tax advice.

---

## Key Features

1. **Surplus Money Flow Engine**: Evaluates live cash surplus using:
   $$\text{Surplus} = \text{Monthly Income} - \text{Total Fixed Expenses} - \text{Average Monthly Variable Spend}$$
   Visualizes the progression of funds through an interactive flowchart.
2. **Onboarding Pipeline**: Streamlines the registration of Net Income, Current Bank Balances, and multiple fixed obligations (Rent, EMIs, Utility Bills).
3. **Daily Transaction Ledger**: Log variable costs or ad-hoc income sources. Live balance updates dynamically on transactions logging or deletions.
4. **Data Visualization**: Renders interactive category allocations (Pie charts) and current month variable trends (Line charts) via Recharts.
5. **AI Advisors & Affordability Checking**:
   - Query whether high-cost items (e.g. laptop, phone) are safe to purchase given cash buffers and surplus flows.
   - Request holistic savings checkups and prioritized roadmap checklists.
6. **Investment Calculators**:
   - **Emergency reserves checker**: Evaluates if the user maintains a 6-month fixed expenditure buffer.
   - **Fixed Deposit planner**: Compounds interest quarterly with smart lock-in suggestions.
   - **Mutual Fund SIP simulator**: Compares regular monthly SIPs and lumpsum returns.
   - **Scenario Compare matrix**: Compares identical capital performance in Safe FDs vs Equity SIPs side by side.
   - **Goal Planner**: Saves targeted savings goals and computes required monthly SIP contributions.

---

## Tech Stack

*   **Frontend**: React v19 (Vite), React Router v7, Tailwind CSS v3, Recharts, Lucide Icons
*   **Backend**: Node.js + Express (Vercel Serverless Function architecture)
*   **Database**: PostgreSQL (Prisma ORM)
*   **AI Integration**: Groq API (OpenAI client wrapper, server-side only)

---

## Project Structure

```
/
├── api/                   # Express backend server (Serverless Functions)
│   ├── config/            # DB configuration (Prisma client)
│   ├── controllers/       # Route controllers (Auth, Transactions, Advisor, AI)
│   ├── middleware/        # JWT Authentication check
│   ├── utils/             # Exact financial math utilities (math-utils.js)
│   └── index.js           # Server routes & main Express app
├── prisma/                # Database models
│   └── schema.prisma      # Prisma schema file
├── src/                   # React Vite frontend source
│   ├── components/        # Layout, navigation, flow charts, and disclaimers
│   ├── contexts/          # Auth, onboarding, and local state sync
│   ├── pages/             # Auth forms, onboarding panels, dashboard, advisor views
│   ├── utils/             # Formatters (Indian Rupees formatting, dates, percents)
│   ├── App.jsx            # App routes and security shields
│   └── main.jsx           # Mounting entry
├── vercel.json            # Deployment routing
├── vite.config.js         # Local dev proxy configuration
└── package.json           # Scripts and dependencies
```

---

## Local Setup Instructions

### 1. Clone the repository and install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root folder using `.env.example` as a template:
```env
DATABASE_URL="postgresql://username:password@hostname/dbname?sslmode=require"
JWT_SECRET="use_a_secure_random_string"
GROQ_API_KEY="gsk_your_groq_key"
```

### 3. Generate Prisma Client & Sync Database
Generate local ORM client code:
```bash
npm run db:generate
```
Push the database schema directly to your PostgreSQL instance (e.g. Neon):
```bash
npm run db:push
```

### 4. Running the Application locally

Start the **Express Backend** (runs on port 5000):
```bash
npm run start
```

In a separate terminal, start the **Vite React Frontend** (Vite automatically proxies `/api` calls to port 5000):
```bash
npm run dev
```

Visit the application at the URL displayed by Vite (normally `http://localhost:5173`).

---

## Deployment to Vercel

This repository is optimized for Vercel. 

1. Push your code to GitHub.
2. Link the repository to Vercel.
3. Configure the Environment Variables (`DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`) in the Vercel dashboard.
4. Deploy! Vercel will automatically compile the Vite frontend into `dist` and deploy `/api/index.js` as an Express serverless function rewriting all `/api/*` requests.
