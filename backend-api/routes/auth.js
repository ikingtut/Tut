const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../lib/db');
const { generateToken } = require('../lib/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    const token = generateToken({ userId: user.id, email: user.email });
    res.json({ user, token });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed.' });
  }
});

module.exports = router;
