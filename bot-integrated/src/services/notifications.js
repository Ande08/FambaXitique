const botApi = require('./api');

async function startNotificationPoller(sock) {
    const interval = parseInt(process.env.POLLING_INTERVAL || '5000');
    
    console.log(`🔔 Polling de notificações iniciado (cada ${interval}ms)`);

    setInterval(async () => {
        try {
            const response = await botApi.getNotifications();
            const notifications = response.data;

            if (notifications && notifications.length > 0) {
                console.log(`📩 [POLLER] Encontradas ${notifications.length} notificações.`);
                
                for (const note of notifications) {
                    try {
                        const jid = note.phone.includes('@') ? note.phone : `${note.phone}@s.whatsapp.net`;
                        console.log(`[POLLER] Enviando "${note.type}" para ${jid}...`);
                        
                        await sock.sendMessage(jid, { text: note.content });
                        console.log(`✅ [POLLER] Mensagem enviada para ${jid}.`);
                        
                        // Mark as sent in backend
                        await botApi.markNotificationSent(note.id);
                    } catch (err) {
                        console.error(`❌ [POLLER] Erro ao processar notificação ${note.id}:`, err.message);
                        // If it's a connection issue, we might want to break the loop
                        if (err.message.includes('closed')) break;
                    }
                }
            } else {
                // Silently skip if no notifications
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.error('❌ [POLLER ERROR] Não autorizado (401). Verifique o BOT_API_TOKEN.');
            } else if (error.code !== 'ECONNREFUSED') {
                console.error('⚠️ [POLLER ERROR]:', error.message);
            }
        }
    }, interval);
}

module.exports = startNotificationPoller;
