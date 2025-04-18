# GovFeed App

Full-stack RSS and API aggregator for defense & government news.

## Prerequisites

- Go ≥ 1.18  
- Node.js ≥ 16  
- PostgreSQL  
- Git

## 🚀 How to Run

```bash
# 1. Clone the repo
git clone https://github.com/your-username/gov-feed-app.git
cd gov-feed-app

# 2. Set up backend
cd gov-feed-aggregator

# Create a .env file with:
# DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<dbname>
# OPENAI_API_KEY=your_openai_key

go mod tidy
go run main.go

# 3. Set up frontend (in a new terminal)
cd gov-feed-frontend
npm install
npm run dev
