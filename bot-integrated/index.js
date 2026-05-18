const connectToWhatsApp = require('./src/services/whatsapp');
const handleMessage = require('./src/commands/commands');
const startNotificationPoller = require('./src/services/notifications');
require('dotenv').config();

console.log('🚀 Iniciando FambaXitique Bot Integrado...');

connectToWhatsApp(
    // Ao receber mensagem
    async (sock, msg) => {
        try {
            await handleMessage(sock, msg);
        } catch (err) {
            console.error('💥 Erro ao processar mensagem:', err.message);
        }
    },
    // Ao abrir a conexão
    (sock) => {
        // Iniciar o serviço de sondagem de notificações
        startNotificationPoller(sock);
    }
).catch(err => {
    console.error('❌ Falha crítica ao iniciar o Bot:', err);
    process.exit(1);
});
