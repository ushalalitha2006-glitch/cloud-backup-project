const cron = require('node-cron');
const { exec } = require('child_process');

// Run every minute
cron.schedule('0 0 * * *', () => {

  console.log('Running scheduled backup...');

  exec('node src/backup.js', (error, stdout, stderr) => {

    if (error) {
      console.log(`Error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }

    console.log(stdout);
  });

});

console.log('Scheduler started...');