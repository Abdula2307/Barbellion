const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { action } = req.query;

  if (action === 'signup') {
    try {
      const { username, password, country } = req.body;
      if (!username || !password) return res.status(400).json({ message: 'Username and password required.' });

      const hasMinLength = password.length >= 8;
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasMinLength || !hasLetter || !hasNumber) {
        return res.status(400).json({ message: 'Password must be 8+ chars with letters and numbers.' });
      }

      const existing = await db.findUserByUsername(username);
      if (existing) return res.status(409).json({ message: 'Username already taken.' });

      const hashed = await bcrypt.hash(password, 10);
      const user = await db.createUser(username, hashed, country);
      
      // Updated session duration to 20 hours
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '20h' });

      return res.status(201).json({ token, isNewUser: true, userId: user.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Signup failed.' });
    }
  }

  if (action === 'login') {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: 'Username and password required.' });

      const user = await db.findUserByUsername(username);
      if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'Invalid credentials.' });

      // Updated session duration to 20 hours
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '20h' });
      return res.json({ token, isNewUser: !user.onboarded, userId: user.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Login failed.' });
    }
  }

  return res.status(400).json({ message: 'Unknown action.' });
};
