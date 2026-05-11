require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs-extra');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// FIX: make sure key is 32 bytes
function getKey() {
  return crypto
    .createHash('sha256')
    .update(process.env.ENCRYPTION_KEY)
    .digest();
}

async function backupDatabase() {
  try {
    await client.connect();

    // STEP 1: Fetch data
    const result = await client.query('SELECT * FROM notes');

    const backupData = JSON.stringify(result.rows, null, 2);

    // STEP 2: Create versioned filename
    const filename = `backup-${Date.now()}.txt`;

    // STEP 3: Encrypt data (AES-256-CBC)
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      getKey(),
      iv
    );

    let encrypted = cipher.update(backupData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // store IV with data (needed for restore)
    const finalData = iv.toString('hex') + ':' + encrypted;

    // STEP 4: Save locally (optional)
    await fs.writeFile(filename, finalData);

    console.log('Encrypted backup created');

    // STEP 5: Upload to Supabase Storage
    const fileBuffer = await fs.readFile(filename);

    const { error } = await supabase.storage
      .from('backups')
      .upload(filename, fileBuffer);

    // STEP 6: Log result in DB
    if (error) {
      console.log('Upload failed:', error.message);

      await client.query(
        'INSERT INTO backup_logs(filename, status) VALUES($1, $2)',
        [filename, 'FAILED']
      );
    } else {
      console.log('Backup uploaded successfully');

      await client.query(
        'INSERT INTO backup_logs(filename, status) VALUES($1, $2)',
        [filename, 'SUCCESS']
      );
    }

    // STEP 7: Cleanup local file
    await fs.remove(filename);

    await client.end();

  } catch (err) {
    console.log('Backup error:', err.message);
  }
}

backupDatabase();