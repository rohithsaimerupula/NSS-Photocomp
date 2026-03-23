const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('.')); // Serve frontend files

// Database setup
const db = new sqlite3.Database('./competition.db', (err) => {
    if (err) console.error('DB Connection Error:', err.message);
    else console.log('Connected to SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        leaderName TEXT,
        leaderRegNo TEXT UNIQUE,
        members TEXT,
        branch TEXT,
        section TEXT,
        regNumbers TEXT,
        password TEXT,
        livePhoto TEXT,
        status TEXT DEFAULT 'pending',
        regDate TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        leadName TEXT,
        leadRegNo TEXT,
        photoPath TEXT,
        infoScreenshotPath TEXT,
        timestamp TEXT
    )`);
});

// Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// API Endpoints
app.post('/api/register', upload.array('idCards'), (req, res) => {
    const { leaderName, leaderRegNo, members, branch, section, regNumbers, password, livePhoto } = req.body;
    const stmt = db.prepare(`INSERT INTO teams (leaderName, leaderRegNo, members, branch, section, regNumbers, password, livePhoto, regDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run([leaderName, leaderRegNo, members, branch, section, JSON.stringify(regNumbers), password, livePhoto, new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Registration submitted successfully!' });
    });
    stmt.finalize();
});

app.post('/api/login', (req, res) => {
    const { regNo, password } = req.body;
    db.get(`SELECT * FROM teams WHERE leaderRegNo = ? AND password = ?`, [regNo, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid credentials' });
        if (row.status !== 'approved') return res.status(403).json({ error: 'Approval pending' });
        res.json(row);
    });
});

app.get('/api/admin/pending', (req, res) => {
    db.all(`SELECT * FROM teams WHERE status = 'pending'`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/approve', (req, res) => {
    const { regNo, status } = req.body;
    db.run(`UPDATE teams SET status = ? WHERE leaderRegNo = ?`, [status, regNo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Status updated successfully' });
    });
});

app.post('/api/upload', upload.fields([{ name: 'compPhoto', maxCount: 1 }, { name: 'infoScreenshot', maxCount: 1 }]), (req, res) => {
    const { title, leadName, leadRegNo } = req.body;
    const photoPath = req.files['compPhoto'] ? req.files['compPhoto'][0].path : '';
    const infoPath = req.files['infoScreenshot'] ? req.files['infoScreenshot'][0].path : '';
    
    const stmt = db.prepare(`INSERT INTO entries (title, leadName, leadRegNo, photoPath, infoScreenshotPath, timestamp) VALUES (?, ?, ?, ?, ?, ?)`);
    stmt.run([title, leadName, leadRegNo, photoPath, infoPath, new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Competition entry submitted!' });
    });
    stmt.finalize();
});

app.get('/api/gallery', (req, res) => {
    db.all(`SELECT * FROM entries`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
