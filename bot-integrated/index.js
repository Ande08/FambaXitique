const connectToWhatsApp = require('./whatsapp');
const handleMessage = require('./commands');
const startNotificationPoller = require('./notifications');
require('dotenv').config();

console.log('🚀 Iniciando FambaXitique Bot Integrado...');

connectToWhatsApp(
    // On Message
    async (sock, msg) => {
        try {
            await handleMessage(sock, msg);
        } catch (err) {
            console.error('💥 Erro ao processar mensagem:', err.message);
        }
    },
    // On Open
    (sock) => {
        // Start the notification poller service
        startNotificationPoller(sock);
    }
).catch(err => {
    console.error('❌ Falha crítica ao iniciar o Bot:', err);
    process.exit(1);
});
