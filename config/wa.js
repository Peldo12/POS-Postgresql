const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal'); // Opsional, buat nampilin QR di terminal

async function connectToWhatsApp() {
    // 1. Siapkan folder penyimpanan sesi login (misal di folder 'auth_info_baileys')
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    // 2. Buat socket-nya dengan menyertakan 'auth'
    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu('My POS App'),
    });

    // 3. Tangkap event kredensial berubah supaya sesinya kesimpen
    sock.ev.on('creds.update', saveCreds);

    // 4. Tangkap event koneksi untuk nampilin QR Code manual & status koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;

        // Kalau ada QR code yang muncul, render di terminal
        if (qr) {
            console.log('Scan QR Code di bawah ini:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ WhatsApp Berhasil Terhubung!');
        } else if (connection === 'close') {
            console.log('❌ Koneksi terputus, mencoba menyambungkan ulang...');
            // Panggil ulang fungsinya kalau mau auto reconnect
            connectToWhatsApp();
        }
    });
}

connectToWhatsApp();
