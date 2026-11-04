import express from 'express';
import cors from 'cors';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocketImport, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

const makeWASocket = makeWASocketImport.default || makeWASocketImport;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, 'auth_session');
const ASSETS_DIR = path.join(__dirname, 'assets');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/assets', express.static(ASSETS_DIR));

// Global WA Connection State
let sock = null;
let qrCodeDataUrl = null;
let qrRaw = null;
let isConnected = false;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'open' | 'qr'
let userInfo = null;

// Global Blast Job State
let blastState = {
  isRunning: false,
  shouldStop: false,
  total: 0,
  current: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  currentParticipant: null,
  cooldownUntil: null,
  startedAt: null,
  finishedAt: null,
  logs: []
};

// Utilities
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, ''); // hanya ambil angka

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (cleaned.startsWith('62')) {
    // already starts with 62
  } else {
    cleaned = '62' + cleaned;
  }

  // Nomor WA Indonesia valid biasanya 10-15 digit
  if (cleaned.length < 10 || cleaned.length > 16) {
    return null;
  }

  return cleaned;
}

// Generate Secure One-Time Token untuk URL Registrasi
export function createRegistrationToken(data) {
  const payload = {
    phone: data.notelp || '',
    name: data.name || '',
    id: data.id_registrasi || data.id || '',
    pekerjaan: data.pekerjaan || '',
    email: data.email || '',
    role_permission: data.role_permission || '1',
    gate: data.gate || '1',
    ts: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function compileTemplate(template, data, webBaseUrl = 'http://localhost:5173') {
  let message = template;
  const cleanBase = (webBaseUrl || 'http://localhost:5173').replace(/\/$/, '');
  const regUrl = `${cleanBase}/landing`;

  message = message.replace(/{{\s*(url_registrasi|link_registrasi)\s*}}/gi, regUrl);
  message = message.replace(/{{\s*(name|nama)\s*}}/gi, data.name || '');
  message = message.replace(/{{\s*id_registrasi\s*}}/gi, data.id_registrasi || '');
  message = message.replace(/{{\s*id_independent\s*}}/gi, data.id_independent || '');
  message = message.replace(/{{\s*notelp\s*}}/gi, data.notelp || '');
  message = message.replace(/{{\s*pekerjaan\s*}}/gi, data.pekerjaan || '');
  message = message.replace(/{{\s*email\s*}}/gi, data.email || '');
  message = message.replace(/{{\s*(sesi|role_permission)\s*}}/gi, data.role_permission ? `Sesi ${data.role_permission}` : '');
  message = message.replace(/{{\s*gate\s*}}/gi, data.gate ? `Gate ${data.gate}` : '');
  return message;
}

// Inisialisasi WhatsApp Socket
async function connectToWhatsApp() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      browser: ['Event Registration Admin', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrRaw = qr;
        connectionStatus = 'qr';
        isConnected = false;
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, { scale: 8, margin: 2 });
          console.log('[WA Service] QR Code siap di-scan via web atau terminal');
        } catch (err) {
          console.error('[WA Service] Gagal render QR code:', err);
        }
      }

      if (connection === 'close') {
        isConnected = false;
        userInfo = null;
        qrCodeDataUrl = null;
        qrRaw = null;
        connectionStatus = 'disconnected';

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[WA Service] Koneksi terputus (status code: ${statusCode}). Reconnect? ${shouldReconnect}`);

        if (shouldReconnect) {
          connectionStatus = 'connecting';
          setTimeout(() => connectToWhatsApp(), 3000);
        } else {
          console.log('[WA Service] Sesi telah logout. Silakan scan QR baru.');
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
      } else if (connection === 'open') {
        isConnected = true;
        qrCodeDataUrl = null;
        qrRaw = null;
        connectionStatus = 'open';

        const user = sock.user;
        userInfo = {
          id: user?.id?.split(':')[0] || user?.id || 'Unknown',
          name: user?.name || user?.notify || 'WhatsApp Admin'
        };
        console.log(`[WA Service] Terhubung sebagai: ${userInfo.name} (${userInfo.id})`);
      }
    });
  } catch (error) {
    console.error('[WA Service] Error saat inisialisasi WA socket:', error);
    connectionStatus = 'disconnected';
  }
}

// Endpoint: Cek Status Koneksi & QR Code
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    connected: isConnected,
    status: connectionStatus,
    user: userInfo,
    hasQr: Boolean(qrCodeDataUrl),
    qr: qrCodeDataUrl,
    hasFlyer: fs.existsSync(path.join(ASSETS_DIR, 'invitation.jpg'))
  });
});

// Endpoint: Halaman Web Ramah HP untuk Scan QR
app.get('/qr', (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>WhatsApp Status - Event Organizer</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0fdf4; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            .badge { background: #22c55e; color: white; padding: 6px 16px; border-radius: 999px; font-weight: bold; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">WhatsApp Terhubung</div>
            <h2>${userInfo?.name || 'Admin'}</h2>
            <p>Nomor: <b>${userInfo?.id || ''}</b></p>
            <p style="color: #666; font-size: 14px;">WhatsApp siap digunakan untuk mengirim pesan blast.</p>
          </div>
        </body>
      </html>
    `);
  }

  if (qrCodeDataUrl) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan WhatsApp - Event Organizer</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="5">
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 380px; }
            img { width: 100%; max-width: 280px; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
            ol { text-align: left; font-size: 14px; color: #475569; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="margin-top:0;">Scan WhatsApp Panitia</h3>
            <img src="${qrCodeDataUrl}" alt="QR Code" />
            <ol>
              <li>Buka WhatsApp di HP panitia</li>
              <li>Pilih menu <b>Perangkat Tertaut</b> (Linked Devices)</li>
              <li>Arahkan kamera ke QR di atas</li>
            </ol>
            <p style="font-size: 12px; color: #94a3b8;">Halaman otomatis refresh tiap 5 detik...</p>
          </div>
        </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta http-equiv="refresh" content="3">
        <style>body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }</style>
      </head>
      <body>
        <p>Sedang menyiapkan QR Code WhatsApp, mohon tunggu sebentar...</p>
      </body>
    </html>
  `);
});

// Endpoint: Logout dari Sesi WA
app.post('/api/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
    }
  } catch (err) {
    console.warn('Logout error ignored:', err);
  }

  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    isConnected = false;
    userInfo = null;
    qrCodeDataUrl = null;
    connectionStatus = 'disconnected';
    setTimeout(() => connectToWhatsApp(), 1500);

    res.json({ success: true, message: 'Berhasil logout. Silakan scan QR baru.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint: Test Kirim Pesan ke 1 Nomor (Untuk verifikasi sebelum blast)
app.post('/api/test-send', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(400).json({ success: false, message: 'WhatsApp belum terhubung. Silakan scan QR terlebih dahulu.' });
  }

  const { phone, message, sendFlyer = true } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, message: 'Nomor telepon dan pesan wajib diisi.' });
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    return res.status(400).json({ success: false, message: 'Format nomor telepon tidak valid.' });
  }

  const jid = `${formattedPhone}@s.whatsapp.net`;

  try {
    const [exists] = await sock.onWhatsApp(formattedPhone);
    if (!exists || !exists.exists) {
      return res.status(400).json({
        success: false,
        message: `Nomor ${phone} (${formattedPhone}) tidak terdaftar di WhatsApp.`
      });
    }

    await sock.sendPresenceUpdate('composing', jid);
    await sleep(randomBetween(1500, 2500));

    const flyerPath = path.join(ASSETS_DIR, 'invitation.jpg');
    const isFlyerRequested = sendFlyer === true || String(sendFlyer) === 'true';
    const hasFlyer = isFlyerRequested && fs.existsSync(flyerPath);

    if (hasFlyer) {
      console.log(`[WA Service] Mengirim pesan dengan flyer (${flyerPath}) ke ${jid}`);
      await sock.sendMessage(jid, {
        image: fs.readFileSync(flyerPath),
        caption: message,
        mimetype: 'image/jpeg'
      });
    } else {
      console.log(`[WA Service] Mengirim pesan teks saja ke ${jid} (flyerRequested: ${isFlyerRequested}, exists: ${fs.existsSync(flyerPath)})`);
      await sock.sendMessage(jid, { text: message });
    }

    await sock.sendPresenceUpdate('paused', jid);

    // Update status ke database jika nomor tersebut adalah peserta
    try {
      const formData = new URLSearchParams();
      formData.append('notelp', formattedPhone);
      formData.append('status', 'sent');

      fetch('http://localhost/trisakti/api/UpdateWaStatus.php', {
        method: 'POST',
        body: formData
      }).catch((err) => console.error('[WA Service] Gagal update status test-send ke DB:', err.message));
    } catch {
      // ignore
    }

    res.json({ success: true, message: `Pesan uji coba berhasil terkirim ke ${phone}` });
  } catch (error) {
    console.error('[WA Service] Gagal kirim test pesan:', error);
    res.status(500).json({ success: false, message: `Gagal kirim pesan: ${error.message}` });
  }
});

// Endpoint: Mulai Blast WhatsApp dengan Sistem Anti-Ban
app.post('/api/blast', async (req, res) => {
  if (!isConnected || !sock) {
    return res.status(400).json({ success: false, message: 'WhatsApp belum terhubung. Silakan scan QR terlebih dahulu.' });
  }

  if (blastState.isRunning) {
    return res.status(400).json({
      success: false,
      message: 'Proses blast sedang berjalan. Silakan tunggu hingga selesai atau batalkan terlebih dahulu.'
    });
  }

  const {
    messageTemplate,
    participants = [],
    minDelay = 7000,
    maxDelay = 14000,
    batchSize = 25,
    batchPauseMs = 120000,
    sendFlyer = true,
    webBaseUrl = 'http://localhost:5173'
  } = req.body;

  if (!messageTemplate || !messageTemplate.trim()) {
    return res.status(400).json({ success: false, message: 'Template pesan tidak boleh kosong.' });
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ success: false, message: 'Daftar peserta kosong.' });
  }

  blastState = {
    isRunning: true,
    shouldStop: false,
    total: participants.length,
    current: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    currentParticipant: null,
    cooldownUntil: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logs: []
  };

  runBlastJob({
    messageTemplate,
    participants,
    minDelay,
    maxDelay,
    batchSize,
    batchPauseMs,
    sendFlyer,
    webBaseUrl
  });

  res.json({
    success: true,
    message: `Proses blast untuk ${participants.length} peserta telah dimulai (Flyer: ${sendFlyer ? 'Aktif' : 'Non-aktif'}).`,
    total: participants.length
  });
});

// Endpoint: Cek Progres Blast
app.get('/api/blast/status', (req, res) => {
  res.json({
    success: true,
    data: blastState
  });
});

// Endpoint: Batalkan Blast
app.post('/api/blast/stop', (req, res) => {
  if (!blastState.isRunning) {
    return res.json({ success: true, message: 'Tidak ada proses blast yang sedang berjalan.' });
  }

  blastState.shouldStop = true;
  blastState.logs.push({
    phone: '-',
    name: 'Sistem',
    status: 'stopped',
    time: new Date().toLocaleTimeString('id-ID'),
    message: 'Proses blast dihentikan oleh pengguna.'
  });

  res.json({ success: true, message: 'Perintah pembatalan blast telah dikirim.' });
});

async function runBlastJob({ messageTemplate, participants, minDelay, maxDelay, batchSize, batchPauseMs, sendFlyer, webBaseUrl }) {
  const flyerPath = path.join(ASSETS_DIR, 'invitation.jpg');
  const isFlyerRequested = sendFlyer === true || String(sendFlyer) === 'true';
  const hasFlyer = isFlyerRequested && fs.existsSync(flyerPath);
  console.log(`[Blast Job] Memulai pengiriman ke ${participants.length} peserta (Kirim Gambar: ${hasFlyer ? 'YA' : 'TIDAK'})...`);

  for (let i = 0; i < participants.length; i++) {
    if (blastState.shouldStop) {
      console.log('[Blast Job] Proses dihentikan oleh admin.');
      break;
    }

    const participant = participants[i];
    blastState.current = i + 1;
    blastState.currentParticipant = participant.name || `Peserta #${i + 1}`;

    const formattedPhone = formatPhoneNumber(participant.notelp);

    if (!formattedPhone) {
      blastState.skipped++;
      blastState.logs.unshift({
        phone: participant.notelp || '-',
        name: participant.name,
        status: 'skipped',
        time: new Date().toLocaleTimeString('id-ID'),
        message: 'Format nomor tidak valid'
      });
      continue;
    }

    const jid = `${formattedPhone}@s.whatsapp.net`;
    const compiledMessage = compileTemplate(messageTemplate, participant, webBaseUrl);

    try {
      const [exists] = await sock.onWhatsApp(formattedPhone);
      if (!exists || !exists.exists) {
        blastState.skipped++;
        blastState.logs.unshift({
          phone: formattedPhone,
          name: participant.name,
          status: 'skipped',
          time: new Date().toLocaleTimeString('id-ID'),
          message: 'Nomor tidak terdaftar di WhatsApp'
        });
        continue;
      }

      await sock.sendPresenceUpdate('composing', jid);
      await sleep(randomBetween(1500, 2500));

      if (hasFlyer) {
        await sock.sendMessage(jid, {
          image: fs.readFileSync(flyerPath),
          caption: compiledMessage,
          mimetype: 'image/jpeg'
        });
      } else {
        await sock.sendMessage(jid, { text: compiledMessage });
      }

      await sock.sendPresenceUpdate('paused', jid);

      blastState.sent++;
      blastState.logs.unshift({
        phone: formattedPhone,
        name: participant.name,
        status: 'success',
        time: new Date().toLocaleTimeString('id-ID'),
        message: hasFlyer ? 'Terkirim (dengan Gambar)' : 'Terkirim'
      });
      console.log(`[Blast Job] [${i + 1}/${participants.length}] Terkirim ke ${participant.name} (${formattedPhone})`);

      // Update status pengiriman ke database
      try {
        const formData = new URLSearchParams();
        formData.append('notelp', participant.notelp || formattedPhone);
        if (participant.id_registrasi) formData.append('id_registrasi', participant.id_registrasi);
        formData.append('status', 'sent');

        fetch('http://localhost/trisakti/api/UpdateWaStatus.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        }).catch(e => console.warn('[Blast Job] Gagal update status DB:', e.message));
      } catch {}
    } catch (err) {
      blastState.failed++;
      blastState.logs.unshift({
        phone: formattedPhone,
        name: participant.name,
        status: 'failed',
        time: new Date().toLocaleTimeString('id-ID'),
        message: err.message || 'Gagal mengirim pesan'
      });
      console.error(`[Blast Job] Gagal kirim ke ${participant.name}:`, err.message);

      // Update status gagal ke database
      try {
        const formData = new URLSearchParams();
        formData.append('notelp', participant.notelp || formattedPhone);
        if (participant.id_registrasi) formData.append('id_registrasi', participant.id_registrasi);
        formData.append('status', 'failed');

        fetch('http://localhost/trisakti/api/UpdateWaStatus.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        }).catch(() => {});
      } catch {}
    }

    const isEndOfBatch = (i + 1) % batchSize === 0 && (i + 1) < participants.length;
    if (isEndOfBatch) {
      const cooldownSec = Math.round(batchPauseMs / 1000);
      console.log(`[Blast Job] Menjalankan cooldown batch selama ${cooldownSec} detik...`);
      blastState.cooldownUntil = new Date(Date.now() + batchPauseMs).toISOString();
      blastState.logs.unshift({
        phone: '-',
        name: 'Sistem Anti-Ban',
        status: 'cooldown',
        time: new Date().toLocaleTimeString('id-ID'),
        message: `Istirahat batch (${cooldownSec} detik) untuk mencegah blokir...`
      });

      await sleep(batchPauseMs);
      blastState.cooldownUntil = null;
    } else if (i + 1 < participants.length) {
      const delayTime = randomBetween(minDelay, maxDelay);
      console.log(`[Blast Job] Jeda ${delayTime / 1000}s sebelum pesan berikutnya...`);
      await sleep(delayTime);
    }
  }

  blastState.isRunning = false;
  blastState.shouldStop = false;
  blastState.finishedAt = new Date().toISOString();
  blastState.currentParticipant = null;
  blastState.cooldownUntil = null;

  console.log(`[Blast Job] Selesai! Terkirim: ${blastState.sent}, Gagal: ${blastState.failed}, Dilewati: ${blastState.skipped}`);
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  WhatsApp Blast Service aktif di port ${PORT}`);
  console.log(`  Buka http://localhost:${PORT}/qr untuk scan WhatsApp`);
  console.log(`====================================================`);
  connectToWhatsApp();
});
