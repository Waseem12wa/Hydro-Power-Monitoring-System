const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ 
        success: true, 
        message: 'Login successful',
        username: user.username 
      });
    });
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out' });
});

// Check session
router.get('/check', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
