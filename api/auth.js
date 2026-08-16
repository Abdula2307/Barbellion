const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { action } = req.query;
  const { username, password, country } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    if (action === 'signup') {
      const existingUser = await db.findUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await db.createUser(username, hashedPassword, country || '');

      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(201).json({
        message: 'Account created successfully.',
        token,
        isNewUser: true
      });

    } else if (action === 'login') {
      const user = await db.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        message: 'Login successful.',
        token,
        isNewUser: !user.onboarded
      });

    } else {
      return res.status(400).json({ message: 'Invalid action parameter.' });
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
