# AI-Powered Support Assistant

A full-stack AI-powered support assistant that answers users' questions based on provided product documentation.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KalyanRamGoparaboina/Weiteredge-Technologies)

## 🚀 Features

- **AI Chat Interface**: Real-time chat with LLM-powered responses.
- **Document-Based Retrieval**: The assistant only answers based on the content in `docs.json`.
- **Session Persistence**: Maintains `sessionId` in localStorage and stores conversations in SQLite.
- **Context Awareness**: Remembers the last 5 user-assistant message pairs.
- **Markdown Content**: Supports rich text formatting in AI responses (bold, lists, etc.).
- **Session Management**: Full control to create, switch, and delete chat sessions.
- **Premium UI**: Modern, high-performance dark-themed interface built with React & Lucide.
- **Enhanced Documentation**: Realistic support scenarios for testing.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Lucide-React.
- **Backend**: Node.js, Express.
- **Database**: SQLite (via `sqlite3` and `sqlite` wrapper).
- **LLM**: Google Gemini API (Flash 1.5).

## 📋 Prerequisites

- Node.js (v16+)
- npm
- Google Gemini API Key (or adjustment for OpenAI)

## ⚙️ Setup Instructions

### 1. Backend Setup

1. Navigate to the `/backend` directory.
2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Add your `GEMINI_API_KEY`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the server:
   ```bash
   node server.js
   ```

The server will run at `http://localhost:5000`.

### 2. Frontend Setup

1. Navigate to the `/frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

## 🗄️ Database Schema

### `sessions` table
| Column | Type | Description |
| --- | --- | --- |
| id | TEXT | UUID for the session |
| created_at | DATETIME | Session creation timestamp |
| updated_at | DATETIME | Last activity timestamp |

### `messages` table
| Column | Type | Description |
| --- | --- | --- |
| id | INTEGER | Auto-increment PK |
| session_id | TEXT | FK to sessions |
| role | TEXT | "user" or "assistant" |
| content | TEXT | The message text |
| created_at | DATETIME | Timestamp |

## 📝 API Endpoints

- `POST /api/chat`: Send a message and get an AI response.
- `GET /api/conversations/:sessionId`: Retrieve message history for a session.
- `GET /api/sessions`: List all active/past sessions.

## 🛡️ Assumptions

- The documentation in `docs.json` is sufficient for common user queries.
- Users have a stable internet connection to call the LLM API.
- The `sessionId` is generated on the client and persists until "New Chat" is clicked.
