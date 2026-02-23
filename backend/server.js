/**
 * AI SUPPORT ASSISTANT - BACKEND
 * This is a standard Express server that handles:
 * 1. Database connection (SQLite)
 * 2. LLM Integration (Google Gemini)
 * 3. Chat history management
 * 4. Documentation retrieval
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { initDb } = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve the frontend

// --- RATE LIMITING (Safety measure) ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requests per IP
    message: { error: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// --- LOAD PRODUCT DOCUMENTATION ---
const docsPath = path.join(__dirname, '..', 'docs.json');
let productDocs = [];
try {
    productDocs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));
    console.log(`Loaded ${productDocs.length} documentation items.`);
} catch (err) {
    console.error('ERROR: Could not find or read docs.json', err);
}

// --- DATABASE INITIALIZATION ---
let db;
initDb().then(database => {
    db = database;
    console.log('Successfully connected to SQLite database.');
});

// --- LLM CONFIGURATION (Gemini) ---
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// --- API ENDPOINTS ---

/**
 * A. CHAT ENDPOINT
 * Receives sessionId and message. Returns AI reply.
 */
app.post('/api/chat', async (req, res) => {
    const { sessionId, message } = req.body;

    // Validation
    if (!sessionId || !message) {
        return res.status(400).json({ error: 'Please provide both sessionId and message.' });
    }

    if (!GEMINI_KEY) {
        return res.status(500).json({
            reply: "Wait! I need an API Key to work. Please add GEMINI_API_KEY to your backend .env file.",
            tokensUsed: 0
        });
    }

    try {
        // 1. Ensure the session exists in DB
        const session = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
        if (!session) {
            await db.run('INSERT INTO sessions (id) VALUES (?)', [sessionId]);
        } else {
            // Update timestamp so it looks active
            await db.run('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
        }

        // 2. Get last 5 message pairs (Context Memory)
        const history = await db.all(
            'SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 10',
            [sessionId]
        );
        const chatHistory = history.reverse(); // Chronological order

        // 3. Build the System Prompt
        const docText = productDocs.map(d => `[${d.title}]: ${d.content}`).join('\n');

        const systemPrompt = `
You are a Professional Support Assistant. 
You must ONLY use the documentation below to answer.

DOCS:
${docText}

CHAT HISTORY:
${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

USER: ${message}

STRICT RULE: If the answer is not in the DOCS, you must answer: "Sorry, I don’t have information about that."
Respond in clear, simple language.
`;

        // 4. Ask Gemini
        const result = await model.generateContent(systemPrompt);
        const reply = result.response.text().trim();

        // 5. Store conversation in SQLite
        await db.run('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)', [sessionId, 'user', message]);
        await db.run('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)', [sessionId, 'assistant', reply]);

        // 6. Return response
        res.json({
            reply,
            tokensUsed: result.response.usageMetadata?.totalTokenCount || 0
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Oops! Something went wrong on the server.' });
    }
});

/**
 * B. FETCH FULL CONVERSATION
 */
app.get('/api/conversations/:sessionId', async (req, res) => {
    try {
        const messages = await db.all(
            'SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
            [req.params.sessionId]
        );
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch history.' });
    }
});

/**
 * C. LIST ALL SESSIONS
 */
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await db.all('SELECT id as sessionId, updated_at as lastUpdated FROM sessions ORDER BY updated_at DESC');
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Could not list sessions.' });
    }
});

/**
 * D. DELETE A SESSION (Extra feature)
 */
app.delete('/api/sessions/:sessionId', async (req, res) => {
    try {
        await db.run('DELETE FROM messages WHERE session_id = ?', [req.params.sessionId]);
        await db.run('DELETE FROM sessions WHERE id = ?', [req.params.sessionId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Could not delete.' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`>>> Server is alive at http://localhost:${PORT}`);
});
