const botApi = require('./api');

async function startNotificationPoller(sock) {
    const interval = parseInt(process.env.POLLING_INTERVAL || '5000');
    
    console.log(`🔔 Polling de notificações iniciado (cada ${interval}ms)`);

    setInterval(async () => {
        try {
            const response = await botApi.getNotifications();
            const notifications = response.data;

            if (notifications && notifications.length > 0) {
                console.log(`📩 Processando ${notifications.length} notificações...`);
                
                for (const note of notifications) {
                    try {
                        const jid = note.phone.includes('@') ? note.phone : `${note.phone}@s.whatsapp.net`;
                        
                        await sock.sendMessage(jid, { text: note.content });
                        
                        // Mark as sent in backend
                        await botApi.markNotificationSent(note.id);
                        console.log(`✅ Notificação ${note.id} enviada para ${note.phone}`);
                    } catch (err) {
                        console.error(`❌ Erro ao enviar notificação ${note.id}:`, err.message);
                    }
                }
            }
        } catch (error) {
            // Silently log errors common to local dev (e.g. backend down)
            if (error.code !== 'ECONNREFUSED') {
                console.error('⚠️ Erro no poller de notificações:', error.message);
            }
        }
    }, interval);
}

module.exports = startNotificationPoller;
