// intentionally vulnerable demo server
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public')); // serve index.html from ./public

/**
 * In-memory "users" DB (plaintext passwords) — intentionally insecure.
 * Use only for testing on local/controlled environments.
 */
const users = [
  { id: 1, username: 'alice', password: 'alice123' },
  { id: 2, username: 'bob',   password: 'password' },
  { id: 3, username: 'admin', password: 'admin' }
];

/**
 * Vulnerable login route:
 * - Mimics a naive SQL-like check by evaluating a "query" string (dangerous in real apps).
 * - For demo, we intentionally accept payloads like: username="' OR '1'='1"
 *
 * NOTE: do NOT use this pattern in production.
 */
app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body;

  // Simulate unsafe "query building" (for learning/testing only)
  const unsafeQuery = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  console.log('[DEBUG] unsafeQuery:', unsafeQuery);

  // Vulnerable check: if username contains SQL-like always-true injection, accept
  if (/('|")\s*or\s*.+?=.+?/i.test(username)) {
    // "injection" detected — simulate bypass
    return res.json({ ok: true, message: 'Login bypassed via injection (simulated).', token: 'injection-token' });
  }

  // naive plaintext check
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    // set a simple cookie to simulate session
    res.cookie('session', `user-${user.id}`, { httpOnly: true });
    return res.json({ ok: true, message: 'Login success', token: `token-${user.id}` });
  }

  return res.status(401).json({ ok: false, message: 'Invalid credentials' });
});

/**
 * Protected resource that checks for the cookie token.
 * This is intentionally weak: cookie value is predictable.
 */
app.get('/api/profile', (req, res) => {
  const session = req.cookies.session || '';
  if (!session) return res.status(401).json({ ok: false, message: 'Not authenticated' });

  // predictable mapping: session === "user-<id>"
  const id = parseInt(session.replace('user-', ''), 10);
  const user = users.find(u => u.id === id);
  if (!user) return res.status(401).json({ ok: false, message: 'Invalid session' });

  // return user profile (no sensitive redaction — intentionally insecure)
  res.json({ ok: true, profile: { id: user.id, username: user.username, note: 'This is an insecure test profile.' } });
});

app.listen(PORT, () => console.log(`VULN demo server running on http://localhost:${PORT}`));
