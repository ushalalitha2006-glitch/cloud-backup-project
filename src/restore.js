const crypto = require('crypto');

const { createClient } = require('@supabase/supabase-js');

const { Client } = require('pg');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const dbClient = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

dbClient.connect();

async function restoreBackup(req, res) {

  try {

    const { filename } = req.body;

    // CHECK FILENAME
    if (!filename) {

      return res.status(400).json({
        error: 'filename is required'
      });

    }

    console.log('Requested file:', filename);

    // DOWNLOAD FILE
    const { data, error } = await supabase.storage
      .from('backups')
      .download(filename);

    // HANDLE DOWNLOAD ERROR
    if (error) {

      console.log('DOWNLOAD ERROR:', error);

      return res.status(500).json({
        error: error.message
      });

    }

    // CONVERT FILE TO TEXT
    const encryptedData = Buffer.from(
      await data.arrayBuffer()
    ).toString('utf8');

    // SPLIT IV + ENCRYPTED DATA
    const splitIndex = encryptedData.indexOf(':');

    if (splitIndex === -1) {

      return res.status(500).json({
        error: 'Invalid backup format'
      });

    }

    const ivHex = encryptedData.substring(0, splitIndex);

    const encrypted = encryptedData.substring(splitIndex + 1);

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

    // OPTIONAL:
    // CLEAR OLD DATA BEFORE RESTORE
    // await dbClient.query('DELETE FROM notes');

    // RESTORE DATABASE
    for (const row of records) {

      await dbClient.query(
        'INSERT INTO notes(title, content) VALUES($1, $2)',
        [row.title, row.content]
      );

    }

    // SUCCESS RESPONSE
    res.json({
      message: 'Restore completed successfully',
      restoredRows: records.length
    });

  } catch (err) {

    console.log('RESTORE ERROR:', err);

    res.status(500).json({
      error: err.message
    });

  }

}

module.exports = restoreBackup;