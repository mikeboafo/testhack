const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const serverless = require("serverless-http"); // install this: npm i serverless-http

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../public"))); // serve ./public

// In-memory users (vulnerable)
const users = [
  { id: 1, username: "alice", password: "alice123" },
  { id: 2, username: "bob", password: "password" },
  { id: 3, username: "admin", password: "admin" },
];

// Login route
app.post("/api/login", (req, res) => {
  const { username = "", password = "" } = req.body;
  const unsafeQuery = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
  console.log("[DEBUG] unsafeQuery:", unsafeQuery);

  if (/('|")\s*or\s*.+?=.+?/i.test(username)) {
    return res.json({
      ok: true,
      message: "Login bypassed via injection (simulated).",
      token: "injection-token",
    });
  }

  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    res.cookie("session", `user-${user.id}`, { httpOnly: true });
    return res.json({ ok: true, message: "Login success", token: `token-${user.id}` });
  }

  return res.status(401).json({ ok: false, message: "Invalid credentials" });
});

// Profile route
app.get("/api/profile", (req, res) => {
  const session = req.cookies.session || "";
  if (!session) return res.status(401).json({ ok: false, message: "Not authenticated" });

  const id = parseInt(session.replace("user-", ""), 10);
  const user = users.find((u) => u.id === id);
  if (!user) return res.status(401).json({ ok: false, message: "Invalid session" });

  res.json({ ok: true, profile: { id: user.id, username: user.username, note: "This is an insecure test profile." } });
});

// Wrap for Vercel serverless
module.exports = serverless(app);
