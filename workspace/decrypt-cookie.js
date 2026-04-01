const { execSync } = require('child_process');
const crypto = require('crypto');
const sqlite3 = require('better-sqlite3');

// Pega a chave do Keychain do macOS
function getChromeKey() {
  const pwd = execSync(
    `security find-generic-password -a "Chrome" -s "Chrome Safe Storage" -w`,
    { stdio: ['pipe', 'pipe', 'ignore'] }
  ).toString().trim();

  // Deriva a chave AES usando PBKDF2
  return crypto.pbkdf2Sync(pwd, 'saltysalt', 1003, 16, 'sha1');
}

function decryptCookie(encryptedValue, key) {
  // Chrome usa prefixo "v10" nos cookies macOS
  const buf = Buffer.from(encryptedValue);
  if (buf.slice(0, 3).toString() !== 'v10') {
    return buf.toString('utf8');
  }
  const iv = Buffer.alloc(16, ' ');
  const encrypted = buf.slice(3);
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

try {
  const key = getChromeKey();
  const db = new sqlite3('/tmp/chrome_cookies.db', { readonly: true });

  const cookies = db.prepare(
    "SELECT name, encrypted_value FROM cookies WHERE host_key LIKE '%tesourodireto%' AND name IN ('cf_clearance', '__cf_bm')"
  ).all();

  for (const cookie of cookies) {
    const value = decryptCookie(cookie.encrypted_value, key);
    console.log(`${cookie.name}=${value}`);
  }
  db.close();
} catch(e) {
  console.error('Erro:', e.message);
}
