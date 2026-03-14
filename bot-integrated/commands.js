const botApi = require('./api');
const { getAIResponse } = require('./ai');
const fs = require('fs');
const path = require('path');

const sessions = new Map(); // sender -> { step, userData, groupId, groupName, history: [], isAdmin: false }
const configPath = path.join(__dirname, 'bot-config.json');

async function handleMessage(sock, msg) {
    const jid = msg.key.remoteJid;
    const phone = jid.split('@')[0];
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    
    if (!text) return;

    let session = sessions.get(jid);
    if (!session) {
        session = { history: [], isAdmin: false };
        sessions.set(jid, session);
    }

    // Command: /login <password>
    if (text.toLowerCase().startsWith('/login ')) {
        const password = text.split(' ')[1];
        if (password === process.env.ADMIN_PASSWORD) {
            session.isAdmin = true;
            return sock.sendMessage(jid, { text: "🔓 *Login de Administrador realizado com sucesso!* Agora você pode usar comandos de gestão." });
        } else {
            return sock.sendMessage(jid, { text: "❌ Senha incorreta." });
        }
    }

    // Command: /botname <novo_nome> (Admin Only)
    if (text.toLowerCase().startsWith('/botname ')) {
        if (!session.isAdmin) return sock.sendMessage(jid, { text: "⛔ Comando restrito a Administradores logados." });
        
        const newName = text.substring(9).trim();
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.botName = newName;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        
        return sock.sendMessage(jid, { text: `✅ Nome do bot alterado para: *${newName}*` });
    }

    // Command: /botrules <novas_regras> (Admin Only)
    if (text.toLowerCase().startsWith('/botrules ')) {
        if (!session.isAdmin) return sock.sendMessage(jid, { text: "⛔ Comando restrito a Administradores logados." });
        
        const newRules = text.substring(10).trim();
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.botRules = newRules;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        
        return sock.sendMessage(jid, { text: "✅ Regras de personalidade do bot atualizadas!" });
    }

    // Command: /plano
    if (text.toLowerCase() === '/plano') {
        try {
            const resp = await botApi.getUserInfo(phone);
            const user = resp.data;
            const sub = user.subscription || { planName: "Grátis", endDate: "N/A", botEnabled: false };
            const date = sub.endDate !== "N/A" ? new Date(sub.endDate).toLocaleDateString() : "N/A";
            
            let pmsg = `📋 *Sua Assinatura FambaXitique*\n`;
            pmsg += `- *Plano:* ${sub.planName}\n`;
            pmsg += `- *Válido até:* ${date}\n`;
            pmsg += `- *Status Bot:* ${sub.botEnabled ? "✅ Ativo" : "❌ Inativo"}`;
            
            return sock.sendMessage(jid, { text: pmsg });
        } catch (e) {
            return sock.sendMessage(jid, { text: "⚠️ Erro ao consultar plano. Verifique se seu número está registado." });
        }
    }

    // Command: /git (Admin only - Update system)
    if (text.toLowerCase() === '/git') {
        try {
            const resp = await botApi.getUserInfo(phone);
            if (resp.data.role !== 'SUPER_ADMIN' && !session.isAdmin) {
                return sock.sendMessage(jid, { text: "⛔ Acesso negado. Apenas Super Admins podem atualizar o sistema." });
            }

            await sock.sendMessage(jid, { text: "⚙️ Iniciando atualização via `update.sh`... Isso pode demorar alguns segundos." });

            const { exec } = require('child_process');
            const path = require('path');
            const updatePath = path.join(__dirname, '..', 'update.sh');

            exec(`sh "${updatePath}"`, (error, stdout, stderr) => {
                if (error) {
                    return sock.sendMessage(jid, { text: `❌ Erro na atualização:\n${error.message}` });
                }
                const output = stdout.substring(stdout.length - 500); 
                sock.sendMessage(jid, { text: `✅ Atualização Concluída!\n\n*Resumo das últimas linhas:*\n\`\`\`${output}\`\`\`` });
            });
            return;
        } catch (e) {
            return sock.sendMessage(jid, { text: "⚠️ Erro ao verificar permissões de admin." });
        }
    }

    // --- MAIN INTERACTION FLOW ---

    // Special Trigger for Menu
    if (text.toLowerCase().includes('/menu') || text.toLowerCase().includes('/começar') || text.toLowerCase().includes('/start')) {
        try {
            const resp = await botApi.getUserInfo(phone);
            const user = resp.data;

            if (!user.groups || user.groups.length === 0) {
                return sock.sendMessage(jid, { text: `Olá, *${user.firstName}*! Você não possui grupos ativos no sistema.` });
            }

            let msgText = `Olá, *${user.firstName}*! Escolha um grupo para continuar:\n\n`;
            user.groups.forEach((g, i) => {
                msgText += `*${i + 1}.* ${g.name}\n`;
            });

            session.step = 'select_group';
            session.userData = user;
            session.isRegistered = true;
            return sock.sendMessage(jid, { text: msgText });
        } catch (e) {
            session.isRegistered = false;
        }
    }

    // Step 2: Group Selection
    if (session.step === 'select_group') {
        const idx = parseInt(text) - 1;
        const group = session.userData?.groups?.[idx];
        
        if (group) {
            session.step = 'group_menu';
            session.groupId = group.id;
            session.groupName = group.name;

            let menu = `Você selecionou *${group.name}*. O que deseja fazer?\n\n`;
            menu += `1️⃣ Ver Saldo e Dívida\n`;
            menu += `2️⃣ Pagar Quota\n`;
            menu += `3️⃣ Pedir Empréstimo\n`;
            menu += `4️⃣ Voltar ao início`;

            return sock.sendMessage(jid, { text: menu });
        }
    }

    // Step 3: Group Menu Logic
    if (session.step === 'group_menu') {
        switch (text) {
            case '1':
                const statusResp = await botApi.getStatus(phone);
                const status = statusResp.data;
                let sMsg = `📊 *Status no Grupo ${session.groupName}*\n\n`;
                sMsg += `💰 Poupança Total: ${status.totalContribution} MT\n`;
                
                const groupLoan = status.activeLoans.find(l => l.groupName === session.groupName);
                if (groupLoan) {
                    sMsg += `\n*Empréstimo Ativo:*\n`;
                    sMsg += `- Valor: ${groupLoan.amountRequested} MT\n`;
                    sMsg += `- Falta: ${groupLoan.remainingBalance} MT (${groupLoan.progress}% pago)`;
                } else {
                    sMsg += `\n✅ Sem dívidas ativas neste grupo.`;
                }
                return sock.sendMessage(jid, { text: sMsg });

            case '2':
                session.step = 'await_payment';
                return sock.sendMessage(jid, { text: "Por favor, envie o ID da transação (ex: DBS...) e o valor pago." });

            case '3':
                session.step = 'await_loan';
                return sock.sendMessage(jid, { text: "Quanto deseja pedir emprestado? (Digite apenas o valor)" });

            case '4':
                delete session.step;
                return sock.sendMessage(jid, { text: "Sessão encerrada. Como posso ajudar?" });
        }
    }

    // Processing Payments/Loans
    if (session.step === 'await_payment') {
        const amountMatch = text.match(/(\d+)/);
        const amount = amountMatch ? parseInt(amountMatch[0]) : 0;
        const txId = text.replace(amount.toString(), '').trim() || text;

        try {
            await botApi.submitPayment({
                phone,
                transactionId: txId.toUpperCase(),
                amount,
                groupId: session.groupId
            });
            sock.sendMessage(jid, { text: "✅ Pagamento submetido! Aguarde a confirmação do administrador." });
        } catch (err) {
            sock.sendMessage(jid, { text: `❌ Erro: ${err.response?.data?.message || err.message}` });
        }
        session.step = 'group_menu';
        return;
    }

    if (session.step === 'await_loan') {
        const amount = parseInt(text);
        if (isNaN(amount)) return sock.sendMessage(jid, { text: "⚠️ Valor inválido. Digite apenas números." });

        try {
            await botApi.submitLoan({
                phone,
                amount,
                groupId: session.groupId,
                notes: "Solicitado via Bot Integrado"
            });
            sock.sendMessage(jid, { text: "✅ Pedido de empréstimo enviado com sucesso!" });
        } catch (err) {
            sock.sendMessage(jid, { text: `❌ Erro: ${err.response?.data?.message || err.message}` });
        }
        session.step = 'group_menu';
        return;
    }

    // --- AI FALLBACK ---
    try {
        await sock.sendPresenceUpdate('composing', jid);
        
        if (session.isRegistered === undefined) {
            try {
                await botApi.getUserInfo(phone);
                session.isRegistered = true;
            } catch (e) {
                session.isRegistered = false;
            }
        }

        // Fetch Plans if the user is asking about prices/plans
        let plansData = null;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('preço') || lowerText.includes('valor') || lowerText.includes('plano') || lowerText.includes('pagar') || lowerText.includes('custo') || lowerText.includes('assinatura')) {
            try {
                const plansResp = await botApi.getPlans();
                plansData = plansResp.data;
            } catch (e) {
                console.error("❌ Error fetching plans for AI:", e.message);
            }
        }

        if (!session.history) session.history = [];

        const aiResponse = await getAIResponse(text, phone, session.history, session.isRegistered, plansData);
        
        session.history.push({ role: 'user', content: text });
        session.history.push({ role: 'assistant', content: aiResponse });
        
        if (session.history.length > 10) session.history = session.history.slice(-10);

        await sock.sendMessage(jid, { text: aiResponse });
        await sock.sendPresenceUpdate('paused', jid);
    } catch (aiErr) {
        console.error('💥 AI Error in handler:', aiErr.message);
    }
}

module.exports = handleMessage;
