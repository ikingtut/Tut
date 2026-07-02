require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRouter = require('./routes/auth');
const devicesRouter = require('./routes/devices');
const filesRouter = require('./routes/files');
const sessionsRouter = require('./routes/sessions');
const { query } = require('./lib/db');

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/devices', devicesRouter);
app.use('/files', filesRouter);
app.use('/sessions', sessionsRouter);

app.post('/install-schema', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await query(sql);
    res.json({ message: 'Schema installed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Schema installation failed.' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend API listening on port ${PORT}`);
});
