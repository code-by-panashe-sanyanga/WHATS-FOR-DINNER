// I keep the API routes, auth checks, and database setup together here.
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, '..', 'frontend');

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'customers.db');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// I wrap sqlite callbacks so I can use async await in the API routes.
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
            if (error) return reject(error);
            return resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
            if (error) return reject(error);
            return resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) return reject(error);
            return resolve(rows);
        });
    });
}

async function initDb() {
    // I create customer records here.
    await run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // I keep login sessions here using generated tokens.
    await run(`
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);

    // I store saved meals per customer here.
    await run(`
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            dish_id TEXT NOT NULL,
            title TEXT NOT NULL,
            link TEXT NOT NULL,
            image TEXT,
            country TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (customer_id, dish_id),
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        )
    `);
}

app.use(express.json());
app.use(express.static(frontendDir));

// I block protected routes unless the token maps to a valid session and customer.
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const session = await get(
            'SELECT token, customer_id FROM sessions WHERE token = ?',
            [token]
        );

        if (!session) {
            return res.status(401).json({ error: 'Session expired. Please sign in again.' });
        }

        const customer = await get(
            'SELECT id, name, email FROM customers WHERE id = ?',
            [session.customer_id]
        );

        if (!customer) {
            return res.status(401).json({ error: 'Customer account not found.' });
        }

        req.customer = customer;
        req.token = token;
        return next();
    } catch (error) {
        return res.status(500).json({ error: 'Authentication error' });
    }
}

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        if (String(password).length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await get('SELECT id FROM customers WHERE email = ?', [normalizedEmail]);
        if (existing) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        // I hash passwords before writing them to the database.
        const passwordHash = await bcrypt.hash(String(password), 10);
        const result = await run(
            'INSERT INTO customers (name, email, password_hash) VALUES (?, ?, ?)',
            [String(name).trim(), normalizedEmail, passwordHash]
        );

        const token = crypto.randomBytes(32).toString('hex');
        await run('INSERT INTO sessions (token, customer_id) VALUES (?, ?)', [token, result.lastID]);

        return res.status(201).json({
            token,
            customer: {
                id: result.lastID,
                name: String(name).trim(),
                email: normalizedEmail
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Could not create account.' });
    }
});

app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const customer = await get(
            'SELECT id, name, email, password_hash FROM customers WHERE email = ?',
            [normalizedEmail]
        );

        if (!customer) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // I compare the submitted password to the stored hash.
        const isValid = await bcrypt.compare(String(password), customer.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        await run('INSERT INTO sessions (token, customer_id) VALUES (?, ?)', [token, customer.id]);

        return res.json({
            token,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email
            }
        });
    } catch (error) {
        return res.status(500).json({ error: 'Could not sign in.' });
    }
});

app.post('/api/auth/signout', requireAuth, async (req, res) => {
    try {
        await run('DELETE FROM sessions WHERE token = ?', [req.token]);
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Could not sign out.' });
    }
});

app.get('/api/customers/me', requireAuth, async (req, res) => {
    try {
        // I return latest favourites first so the account page feels current.
        const favorites = await all(
            `SELECT dish_id, title, link, image, country, created_at
             FROM favorites
             WHERE customer_id = ?
             ORDER BY created_at DESC`,
            [req.customer.id]
        );

        return res.json({
            customer: req.customer,
            favorites
        });
    } catch (error) {
        return res.status(500).json({ error: 'Could not load customer profile.' });
    }
});

app.post('/api/favorites', requireAuth, async (req, res) => {
    try {
        const { dishId, title, link, image, country } = req.body || {};
        if (!dishId || !title || !link) {
            return res.status(400).json({ error: 'dishId, title, and link are required.' });
        }

        await run(
            `INSERT OR IGNORE INTO favorites (customer_id, dish_id, title, link, image, country)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.customer.id, String(dishId), String(title), String(link), String(image || ''), String(country || '')]
        );

        return res.status(201).json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Could not save favourite.' });
    }
});

app.delete('/api/favorites/:dishId', requireAuth, async (req, res) => {
    try {
        const { dishId } = req.params;
        await run(
            'DELETE FROM favorites WHERE customer_id = ? AND dish_id = ?',
            [req.customer.id, String(dishId)]
        );
        return res.json({ ok: true });
    } catch (error) {
        return res.status(500).json({ error: 'Could not remove favourite.' });
    }
});

app.get('*', (req, res) => {
    // I resolve static files first, then pages, then fall back to home.
    const requestPath = (req.path || '').replace(/^\/+/g, '');
    const filePath = path.join(frontendDir, requestPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }

    const pagePath = path.join(frontendDir, 'pages', requestPath);
    if (fs.existsSync(pagePath) && fs.statSync(pagePath).isFile()) {
        return res.sendFile(pagePath);
    }

    return res.sendFile(path.join(frontendDir, 'pages', 'index.html'));
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`WHATS-FOR-DINNER server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize database', error);
        process.exit(1);
    });
