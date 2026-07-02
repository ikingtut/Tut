const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../lib/auth');

const router = express.Router();
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.use(authMiddleware);

router.post('/upload', express.json({ limit: '50mb' }), async (req, res) => {
  const { filename, data, agent_id } = req.body;
  if (!filename || !data || !agent_id) {
    return res.status(400).json({ error: 'filename, data, and agent_id are required.' });
  }

  const destination = path.join(uploadsDir, `${Date.now()}_${path.basename(filename)}`);
  const buffer = Buffer.from(data, 'base64');

  try {
    await fs.promises.writeFile(destination, buffer);
    res.json({ path: destination, message: 'File uploaded successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save file.' });
  }
});

module.exports = router;
