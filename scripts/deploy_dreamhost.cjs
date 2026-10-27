const Client = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

async function deploy() {
  const sftp = new Client();
  const password = process.env.DREAMHOST_PASSWORD || process.argv[2] || 'Peschiera93@';
  const config = {
    host: 'pdx1-shared-a4-06.dreamhost.com',
    port: 22,
    username: 'dh_ajvqnx',
    password: password,
    tryKeyboard: true,
    readyTimeout: 30000
  };

  sftp.client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
    finish([password]);
  });

  const distDir = path.resolve(__dirname, '../dist');
  const remoteDir = '/home/dh_ajvqnx/nisshi.dreamhosters.com';

  console.log(`Connecting to DreamHost SFTP (${config.host} as ${config.username})...`);
  try {
    await sftp.connect(config);
    console.log('✅ Connected successfully to DreamHost SFTP!');

    console.log(`Uploading index.html to ${remoteDir}/index.html...`);
    await sftp.fastPut(path.join(distDir, 'index.html'), `${remoteDir}/index.html`);
    console.log('✅ index.html uploaded successfully!');

    const htaccessPath = path.join(distDir, '.htaccess');
    if (fs.existsSync(htaccessPath)) {
      console.log(`Uploading .htaccess to ${remoteDir}/.htaccess...`);
      await sftp.fastPut(htaccessPath, `${remoteDir}/.htaccess`);
      console.log('✅ .htaccess uploaded successfully!');
    }

    const localAssets = path.join(distDir, 'assets');
    const remoteAssets = `${remoteDir}/assets`;

    if (fs.existsSync(localAssets)) {
      console.log(`Uploading assets directory to ${remoteAssets}...`);
      await sftp.uploadDir(localAssets, remoteAssets);
      console.log('✅ assets directory uploaded successfully!');
    }

    console.log('🎉 100% DEPLOYED SUCCESSFULLY TO DREAMHOST!');
  } catch (err) {
    console.error('❌ SFTP Deploy Error:', err.message);
    throw err;
  } finally {
    await sftp.end();
  }
}

deploy().catch((err) => {
  console.error(err);
  process.exit(1);
});
