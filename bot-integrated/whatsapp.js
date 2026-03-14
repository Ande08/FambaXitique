const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const path = require('path');

async function connectToWhatsApp(onMessage, onOpen) {
    const sessionName = process.env.SESSION_NAME || 'famba-session';
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth', sessionName));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['FambaXitique Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('💠 QR Code gerado. Escaneie para conectar:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldRetry = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            
            console.log('❌ Conexão fechada. Reconectando...', shouldRetry);
            if (shouldRetry) connectToWhatsApp(onMessage, onOpen);
        } else if (connection === 'open') {
            console.log('✅ Bot conectado com sucesso ao WhatsApp!');
            if (onOpen) onOpen(sock);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    await onMessage(sock, msg);
                }
            }
        }
    });

    return sock;
}

module.exports = connectToWhatsApp;
