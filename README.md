# LinkUp — Professional Collaboration Platform

A LinkedIn-like platform built with **Go (Gin)** backend and **React (Vite + Tailwind)** frontend.

## Features
- ✅ User registration & login (password + email OTP)
- ✅ JWT authentication with bcrypt password hashing
- ✅ Feed with posts, likes, tags
- ✅ Blog platform with Markdown support
- ✅ Real-time group & direct chat via WebSockets
- ✅ MongoDB storage (users, posts, blogs, messages)
- ✅ Unit tests (Go testing framework)
- ✅ Deploy-ready for Render / Railway

## Tech Stack
| Layer | Tech |
|---|---|
| Backend | Go 1.22 + Gin + Gorilla WebSocket |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | MongoDB (Atlas free tier) |
| Auth | JWT (golang-jwt) + bcrypt |
| Deploy | Render (backend + static frontend) |

---

## Local Development

### Prerequisites
- Go 1.22+  → `brew install go`
- Node 18+  → `brew install node`
- MongoDB Atlas account (free) → https://cloud.mongodb.com

---

### 1. Clone & setup MongoDB Atlas

1. Go to https://cloud.mongodb.com → Create free cluster
2. Create a database user with read/write access
3. Get connection string: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/`
4. Add your IP to Network Access (or allow 0.0.0.0/0 for dev)

---

### 2. Backend setup

```bash
cd backend

# Install dependencies
go mod tidy

# Copy and fill env
cp .env.example .env
# Edit .env with your MONGODB_URI and JWT_SECRET

# Run
go run main.go
# Server starts on http://localhost:8080
```

**Test it:**
```bash
curl http://localhost:8080/health
# {"status":"ok","service":"LinkUp API"}
```

**Run unit tests:**
```bash
go test ./internal/...
```

---

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Run (Vite proxies /api and /ws to localhost:8080 automatically)
npm run dev
# Opens http://localhost:5173
```

---

## API Reference

### Auth
| Method | Endpoint | Body | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | `{name, email, password, role}` | No |
| POST | `/api/v1/auth/login` | `{email, password}` | No |
| POST | `/api/v1/auth/otp/send` | `{email}` | No |
| POST | `/api/v1/auth/otp/verify` | `{email, otp}` | No |

### Users
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/v1/users/me` | ✅ |
| PUT | `/api/v1/users/me` | ✅ |
| GET | `/api/v1/users/:id` | ✅ |
| GET | `/api/v1/users?role=retailer` | ✅ |

### Posts
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/v1/posts` | ✅ |
| POST | `/api/v1/posts` | ✅ |
| PUT | `/api/v1/posts/:id` | ✅ |
| DELETE | `/api/v1/posts/:id` | ✅ |
| POST | `/api/v1/posts/:id/like` | ✅ |

### Blogs
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/v1/blogs` | ✅ |
| POST | `/api/v1/blogs` | ✅ |
| GET | `/api/v1/blogs/:id` | ✅ |
| PUT | `/api/v1/blogs/:id` | ✅ |
| DELETE | `/api/v1/blogs/:id` | ✅ |

### WebSocket Chat
```
ws://localhost:8080/ws/chat?room=general&token=<JWT>
```
Send: `{"type":"message","content":"Hello!"}`
Receive: `{"type":"message","content":"Hello!","sender":"Arjun","timestamp":"..."}`

---

## Deployment on Render (Free)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/linkup.git
git push -u origin main
```

### Step 2: Deploy Backend on Render
1. Go to https://render.com → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Go
   - **Build Command:** `go build -o server ./main.go`
   - **Start Command:** `./server`
4. Environment Variables:
   - `MONGODB_URI` → your Atlas connection string
   - `JWT_SECRET` → any random 32+ char string
   - `FRONTEND_URL` → your frontend URL (set after step 3)

### Step 3: Deploy Frontend on Render
1. New → Static Site
2. Connect same repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Environment Variables:
   - `VITE_API_URL` → `https://<your-backend>.onrender.com/api/v1`
   - `VITE_WS_URL` → `wss://<your-backend>.onrender.com`
5. Add Rewrite Rule: `/* → /index.html` (for React Router)

### Step 4: Update CORS
Go back to backend service → set `FRONTEND_URL` to your static site URL.

---

## Project Structure
```
linkup/
├── backend/
│   ├── main.go
│   ├── go.mod
│   ├── .env.example
│   └── internal/
│       ├── auth/       # Register, login, OTP
│       ├── users/      # Profile CRUD
│       ├── posts/      # Feed posts + likes
│       ├── blogs/      # Blog CRUD
│       ├── chat/       # WebSocket hub
│       ├── middleware/ # JWT auth
│       ├── models/     # MongoDB schemas
│       └── db/         # MongoDB connection
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── pages/      # LoginPage, FeedPage, ChatPage...
    │   ├── components/ # Layout, UI components
    │   ├── store/      # Zustand auth store
    │   └── lib/        # Axios client
    └── package.json
```
