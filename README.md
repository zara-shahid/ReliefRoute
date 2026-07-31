<div align="center">
  <h1>🚨 ReliefRoute</h1>
  <p>An intelligent disaster relief routing and logistics platform.</p>
</div>

## 📌 Overview

**ReliefRoute** is a comprehensive logistics and fleet management platform designed to assist in disaster relief efforts. It helps coordinate vehicles, track critical resource needs across various disaster sites, and automatically optimizes delivery routes to ensure timely assistance where it's needed most.

The system is built with a modern **Next.js** frontend and a powerful **Django** backend, configured to run seamlessly as serverless functions on Vercel using a PostgreSQL database.

## ✨ Features

- **Interactive Map:** Visualize disaster sites, fleet depots, and optimized routes dynamically.
- **Site & Fleet Management:** Manage disaster sites (severity, required resources, people affected) and dispatch vehicles based on capacity.
- **Route Optimization:** Calculate the most efficient paths for vehicles to deliver resources to critical sites.
- **Live Fleet Simulator:** View real-time simulated movements of your vehicles as they traverse their routes.
- **Dispatch Agent Chat:** Integrated AI chat to coordinate logistics and query dispatch data.

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Axios
- **Backend:** Django, Django REST Framework, Python
- **Database:** PostgreSQL (via Supabase/hosted DB)
- **Deployment:** Vercel (Frontend + Python Serverless Functions)

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.9+)
- PostgreSQL or SQLite (for local testing)

### 1. Backend Setup (Django)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r ../requirements.txt

# Run migrations
python manage.py migrate

# (Optional) Seed the database with mock data
python seed.py

# Start the server
python manage.py runserver
```

### 2. Frontend Setup (Next.js)

```bash
cd frontend
npm install

# Start the development server
npm run dev
```

Your frontend will be running at `http://localhost:3000` and it will communicate with the Django backend at `http://127.0.0.1:8000/api`.

## ☁️ Deployment to Vercel

This repository is pre-configured as a monorepo for Vercel deployment using the `vercel.json` file.

1. Create a new project in [Vercel](https://vercel.com/dashboard) and connect this repository.
2. Ensure you have a hosted PostgreSQL database (e.g., Supabase, Neon).
3. Set the following Environment Variables in your Vercel project:
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_HOST`
   - `DB_PORT`
   - `NEXT_PUBLIC_API_URL` (Set to `/api`)
4. Deploy! Vercel will build the frontend with `@vercel/next` and serve the Django backend using `@vercel/python`.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).