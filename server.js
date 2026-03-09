const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/ai', aiRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Initialize database and start server
db.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`🌊 Hydro Power Monitoring System running on http://localhost:${PORT}`);
    console.log(`🤖 AI Models: llama-3.3-70b-versatile, llama-3.1-8b-instant, gemma2-9b-it`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
