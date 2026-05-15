if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');

// --------------------
// SUPABASE
// --------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// --------------------
// DATABASE
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

// --------------------
// BACKUP FUNCTION
// --------------------
async function runBackup() {

  try {

    // CONNECT DB
    await dbClient.connect();

    console.log("DB connected");

    // GET DATA
    const result = await dbClient.query(
      'SELECT * FROM notes'
    );

    console.log("Fetched notes");

    const data = JSON.stringify(result.rows);

    // ENCRYPT
    const iv = crypto.randomBytes(16);

    const key = crypto
      .createHash('sha256')
      .update(process.env.ENCRYPTION_KEY)
      .digest();

    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      key,
      iv
    );

    let encrypted = cipher.update(
      data,
      'utf8',
      'hex'
    );

    encrypted += cipher.final('hex');

    const finalEncryptedData =
      iv.toString('hex') + ':' + encrypted;

    console.log("Encryption complete");

    // FILE NAME
    const fileName =
      `backup-${Date.now()}.txt`;

    // SAVE FILE
    fs.writeFileSync(
      fileName,
      finalEncryptedData
    );

    console.log("File saved locally");

    // READ FILE
    const fileBuffer =
      fs.readFileSync(fileName);

    // UPLOAD
    const { error } = await supabase.storage
      .from('backups')
      .upload(fileName, fileBuffer, {
        contentType: 'text/plain',
        upsert: false
      });

    if (error) {

      console.log(error);

      throw error;

    }

    console.log("Uploaded to Supabase");

    // SAVE LOG
    await dbClient.query(
      `
      INSERT INTO backup_logs(filename, status)
      VALUES($1, $2)
      `,
      [fileName, 'SUCCESS']
    );

    console.log("Log inserted");

    // DELETE LOCAL FILE
    fs.unlinkSync(fileName);

    console.log("Backup completed");

    // CLOSE DB
    await dbClient.end();

    return true;

  } catch (err) {

    console.log(err);

    throw err;

  }

}

module.exports = {
  runBackup
};