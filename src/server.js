if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const { exec } = require('child_process');
const { Client } = require('pg');
const axios = require('axios');
const crypto = require('crypto');

const app = express();

app.use(express.json());

console.log("DB HOST:", process.env.DB_HOST);

// --------------------
// SUPABASE
// --------------------
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --------------------
// POSTGRES CONNECTION
// --------------------
const dbClient = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// CONNECT DATABASE
dbClient.connect()
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });


// --------------------
// HOME ROUTE
// --------------------
app.get('/', (req, res) => {
  res.send('Cloud Backup System API is running 🚀');
});


// --------------------
// MANUAL BACKUP
// --------------------
app.post('/backup', async (req, res) => {

  try {

    const backupModule = require('./backup');

    await backupModule.runBackup();

    res.json({
      message: 'Backup completed successfully'
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: err.message
    });

  }

});


// --------------------
// VIEW LOGS
// --------------------
app.get('/logs', async (req, res) => {

  try {

    const result = await dbClient.query(
      'SELECT * FROM backup_logs ORDER BY created_at DESC'
    );

    res.json(result.rows);

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});


// --------------------
// RESTORE BACKUP
// --------------------
app.post('/restore', async (req, res) => {

  try {

    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        error: 'filename is required'
      });
    }

    // GET PUBLIC URL
    const { data } = supabase.storage
      .from('backups')
      .getPublicUrl(filename);

    const fileUrl = data.publicUrl;

    // DOWNLOAD FILE
    const response = await axios.get(fileUrl);

    const encryptedData = response.data;

    // SPLIT IV + DATA
    const [ivHex, encrypted] = encryptedData.split(':');

    // CREATE KEY
    const key = crypto
      .createHash('sha256')
      .update(process.env.ENCRYPTION_KEY)
      .digest();

    // DECRYPT
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      Buffer.from(ivHex, 'hex')
    );

    let decrypted = decipher.update(
      encrypted,
      'hex',
      'utf8'
    );

    decrypted += decipher.final('utf8');

    // PARSE JSON
    const records = JSON.parse(decrypted);

    // INSERT INTO DATABASE
    for (const row of records) {

      await dbClient.query(
        'INSERT INTO notes(title, content) VALUES($1, $2)',
        [row.title, row.content]
      );

    }

    res.json({
      message: 'Restore completed successfully',
      restoredRows: records.length
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});


// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});