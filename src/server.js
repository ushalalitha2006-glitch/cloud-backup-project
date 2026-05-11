const cors = require('cors');
require('dotenv').config();


const express = require('express');
const { exec } = require('child_process');
const { Client } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// --------------------
// POSTGRESQL
// --------------------
const dbClient = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

dbClient.connect();


// --------------------
// HOME ROUTE
// --------------------
app.get('/', (req, res) => {
  res.send('Cloud Backup System API is running 🚀');
});


// --------------------
// BACKUP ROUTE
// --------------------
app.post('/backup', (req, res) => {

  exec('node ./src/backup.js', (error, stdout, stderr) => {

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    if (stderr) {
      return res.status(500).json({
        error: stderr
      });
    }

    res.json({
      message: 'Backup completed',
      output: stdout
    });

  });

});


// --------------------
// LOGS ROUTE
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
// RESTORE ROUTE
// --------------------
const restoreBackup = require('./restore');

app.post('/restore', restoreBackup);


// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});