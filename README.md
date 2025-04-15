# 🛰️ Gov Feed App

This is a full-stack application that aggregates defense and government-related news using RSS feeds. It includes:

- `gov-feed-aggregator/`: the Go backend (Gin + PostgreSQL)
- `gov-feed-frontend/`: the React frontend (Vite + JSX)

## 📦 Prerequisites

- Go (>= 1.18)
- Node.js (>= 16)
- PostgreSQL
- Git

## 🛠️ Setup Instructions

### 1. Clone the repository

git clone https://github.com/your-username/gov-feed-app.git  
cd gov-feed-app

### 2. Backend Setup (`gov-feed-aggregator`)

cd gov-feed-aggregator

Create a `.env` file in this folder with:

DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<dbname>  

Install dependencies:

go mod tidy

Run backend:

go run main.go

### 3. Frontend Setup (`gov-feed-frontend`)

Install dependencies:

npm install

Run frontend:

npm run dev


## 📬 Feedback & Contributions

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 🔐 License

MIT
