if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

const fs = require('fs');

const crypto = require('crypto');

const { Client } = require('pg');

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

    await dbClient.connect();

    // GET DATA
    const result = await dbClient.query(
      'SELECT * FROM notes'
    );

    const data = JSON.stringify(result.rows);

    // ENCRYPTION
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

    // UNIQUE FILE NAME
    const fileName =
      `backup-${Date.now()}.txt`;

    // SAVE TEMP FILE
    fs.writeFileSync(
      fileName,
      finalEncryptedData
    );

    // UPLOAD TO SUPABASE STORAGE
    const fileBuffer = fs.readFileSync(fileName);

    const { error } = await supabase.storage
      .from('backups')
      .upload(fileName, fileBuffer, {
        contentType: 'text/plain',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // SAVE LOG
    await dbClient.query(
      `
      INSERT INTO backup_logs(filename, status)
      VALUES($1, $2)
      `,
      [fileName, 'SUCCESS']
    );

    // DELETE LOCAL TEMP FILE
    fs.unlinkSync(fileName);

    console.log('Backup uploaded successfully');

  } catch (err) {

    console.log(err);

    throw err;

  }

}

// EXPORT
module.exports = {
  runBackup
};