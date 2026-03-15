const botApi = require('./api');

async function startNotificationPoller(sock) {
    const interval = parseInt(process.env.POLLING_INTERVAL || '5000');
    
    console.log(`🔔 Polling de notificações iniciado (cada ${interval}ms)`);

    setInterval(async () => {
        try {
            console.log(`[POLLER] Verificando notificações pendentes...`);
            const response = await botApi.getNotifications();
            const notifications = response.data;

            if (notifications && notifications.length > 0) {
                console.log(`📩 [POLLER] Encontradas ${notifications.length} notificações.`);
                
                for (const note of notifications) {
                    try {
                        const jid = note.phone.includes('@') ? note.phone : `${note.phone}@s.whatsapp.net`;
                        console.log(`[POLLER] Enviando "${note.type}" para ${jid}...`);
                        
                        await sock.sendMessage(jid, { text: note.content });
                        console.log(`✅ [POLLER] Mensagem enviada para ${jid}. Notificando backend...`);
                        
                        // Mark as sent in backend
                        await botApi.markNotificationSent(note.id);
                        console.log(`✅ [POLLER] Notificação ${note.id} marcada como enviada no backend.`);
                    } catch (err) {
                        console.error(`❌ [POLLER] Erro ao processar notificação ${note.id}:`, err.message);
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
