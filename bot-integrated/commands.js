const botApi = require('./api');
const { getAIResponse } = require('./ai');
const fs = require('fs');
const path = require('path');

const sessions = new Map(); // sender -> { step, userData, groupId, groupName, history: [], isAdmin: false }
const configPath = path.join(__dirname, 'bot-config.json');

async function handleMessage(sock, msg) {
    const remoteJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || remoteJid;
    let phone = senderJid.split('@')[0].split(':')[0]; // Extracts digits

    // Fix for LID: Use senderPn (real phone) if available when ID is an LID
    if (senderJid.endsWith('@lid') && msg.key.senderPn) {
        phone = msg.key.senderPn.split('@')[0];
    }
    
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    
    console.log(`[MSG] De: ${senderJid} (Phone: ${phone}) | Texto: "${text}"`);
    
    if (!text) return;

    let session = sessions.get(senderJid);
    if (!session) {
        session = { history: [], isAdmin: false, isRegistered: undefined };
        sessions.set(senderJid, session);
    }

    // Centralized Identification at the beginning
    if (session.isRegistered === undefined) {
        try {
            console.log(`[IDENTIFY] Buscando dados de ${phone}...`);
            const resp = await botApi.getUserInfo(phone);
            session.userData = resp.data;
            session.isRegistered = true;
            session.isAdmin = resp.data.role === 'SUPER_ADMIN';
            console.log(`[IDENTIFY] ✅ ${resp.data.firstName} reconhecido (Role: ${resp.data.role})`);
        } catch (e) {
            console.warn(`[IDENTIFY] ⚠️ ${phone} não reconhecido:`, e.response?.data?.message || e.message);
            session.isRegistered = false;
            session.isAdmin = false;
        }
    }

    const isSuper = session.isAdmin;

    // Command: /comandos or /ajuda
    if (text.toLowerCase() === '/comandos' || text.toLowerCase() === '/ajuda') {
        console.log(`[CMD] /ajuda para ${remoteJid}`);
        let helpMsg = `✨ *CENTRAL DE AJUDA FAMBAXITIQUE* ✨\n\n`;
        helpMsg += `Olá, *${session.userData?.firstName || 'Membro'}*! Como posso ser útil hoje?\n\n`;
        helpMsg += `📑 *Comandos Gerais:*\n`;
        helpMsg += `👉 */menu*: Abre o Dashboard principal.\n`;
        helpMsg += `👉 */plano*: Consulta detalhes da sua assinatura.\n`;
        helpMsg += `👉 */id*: Mostra o seu ID e JID para suporte.\n\n`;
        
        if (isSuper) {
            helpMsg += `👑 *Gestão (Admin Supremo):*\n`;
            helpMsg += `👉 */botname <nome>*: Altera o nome do bot.\n`;
            helpMsg += `👉 */botrules <regras>*: Altera a personalidade do bot.\n`;
            helpMsg += `👉 */git*: Atualiza o sistema (git pull).\n`;
        }
        
        helpMsg += `\n_💡 Dica: Você também pode falar comigo naturalmente para tirar dúvidas sobre o sistema!_`;
        
        return sock.sendMessage(remoteJid, { text: helpMsg });
    }

    // Command: /id
    if (text.toLowerCase() === '/id') {
        console.log(`[CMD] /id para ${remoteJid}`);
        return sock.sendMessage(remoteJid, { text: `👤 *Seu ID:* ${phone}\n📱 *Número:* ${phone}\n🆔 *JID:* ${senderJid}` });
    }

    // Command: /login <password> (Optional fallback)
    if (text.toLowerCase().startsWith('/login ')) {
        const password = text.split(' ')[1];
        if (password === process.env.ADMIN_PASSWORD) {
            session.isAdmin = true;
            return sock.sendMessage(remoteJid, { text: "🔓 *Login de Administrador realizado com sucesso!* Agora você pode usar comandos de gestão." });
        } else {
            return sock.sendMessage(remoteJid, { text: "❌ Senha incorreta." });
        }
    }

    // Command: /botname <novo_nome> (Admin Only)
    if (text.toLowerCase().startsWith('/botname ')) {
        if (!isSuper) return sock.sendMessage(remoteJid, { text: "⛔ Comando restrito a Administradores." });
        
        const newName = text.substring(9).trim();
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.botName = newName;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        
        return sock.sendMessage(remoteJid, { text: `✅ Nome do bot alterado para: *${newName}*` });
    }

    // Command: /botrules <novas_regras> (Admin Only)
    if (text.toLowerCase().startsWith('/botrules ')) {
        if (!isSuper) return sock.sendMessage(remoteJid, { text: "⛔ Comando restrito a Administradores." });
        
        const newRules = text.substring(10).trim();
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.botRules = newRules;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        
        return sock.sendMessage(remoteJid, { text: "✅ Regras de personalidade do bot atualizadas!" });
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
            
            return sock.sendMessage(remoteJid, { text: pmsg });
        } catch (e) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Erro ao consultar plano. Verifique se seu número está registado." });
        }
    }

    // Command: /git (Admin only - Update system)
    if (text.toLowerCase() === '/git') {
        if (!isSuper) return sock.sendMessage(remoteJid, { text: "⛔ Acesso negado. Apenas Super Admins podem atualizar o sistema." });

        await sock.sendMessage(remoteJid, { text: "⚙️ Iniciando atualização via `update.sh`... Isso pode demorar alguns segundos." });

        const { exec } = require('child_process');
        const updatePath = path.join(__dirname, '..', 'update.sh');

        exec(`sh "${updatePath}"`, (error, stdout, stderr) => {
            if (error) {
                return sock.sendMessage(remoteJid, { text: `❌ Erro na atualização:\n${error.message}` });
            }
            const output = stdout.substring(stdout.length - 500); 
            sock.sendMessage(remoteJid, { text: `✅ Atualização Concluída!\n\n*Resumo das últimas linhas:*\n\`\`\`${output}\`\`\`` });
        });
        return;
    }

    // --- MAIN INTERACTION FLOW (DASHBOARD) ---

    const showDashboard = async () => {
        let dash = `🌟 *DASHBOARD FAMBAXITIQUE* 🌟\n\n`;
        dash += `Olá, *${session.userData.firstName}*! O que deseja fazer hoje?\n\n`;
        dash += `1️⃣ *Meus Grupos* (Ver saldo e pagar)\n`;
        dash += `2️⃣ *Minhas Faturas* (Ver pendentes)\n`;
        dash += `3️⃣ *Meus Empréstimos* (Ver status)\n`;
        dash += `4️⃣ *Minha Conta* (Plano e ID)\n`;
        dash += `5️⃣ *Ajuda/Sair*\n\n`;
        dash += `_Responda apenas com o NÚMERO da opção desejada._`;
        
        session.step = 'dashboard';
        return sock.sendMessage(remoteJid, { text: dash });
    };

    // Special Trigger for Menu
    if (text.toLowerCase().includes('/menu') || text.toLowerCase().includes('/começar') || text.toLowerCase().includes('/start')) {
        console.log(`[CMD] Dashboard para ${remoteJid}`);
        if (!session.isRegistered) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Você ainda não possui conta no fambaxitique.com. Cadastre-se agora para acessar o menu!" });
        }
        return showDashboard();
    }

    // DASHBOARD HANDLER
    if (session.step === 'dashboard') {
        switch (text) {
            case '1': // MEUS GRUPOS
                const user = session.userData;
                if (!user.groups || user.groups.length === 0) {
                    return sock.sendMessage(remoteJid, { text: "📁 Você não possui grupos ativos no sistema." });
                }
                let gText = `📁 *SEUS GRUPOS*\n\n`;
                user.groups.forEach((g, i) => {
                    gText += `*${i + 1}.* ${g.name} ${g.botEnabled ? '✅' : '❌'}\n`;
                });
                gText += `\n*0.* Voltar ao Dashboard`;
                session.step = 'select_group';
                return sock.sendMessage(remoteJid, { text: gText });

            case '2': // FATURAS
                try {
                    const statusResp = await botApi.getStatus(phone);
                    const invoices = statusResp.data.pendingInvoices || [];
                    if (invoices.length === 0) {
                        return sock.sendMessage(remoteJid, { text: "✅ Você não tem faturas pendentes. Parabéns pela organização!" });
                    }
                    let iText = `🧾 *FATURAS PENDENTES*\n\n`;
                    invoices.forEach((inv, i) => {
                        iText += `🔹 *${inv.groupName}*\n`;
                        iText += `   - Valor: ${inv.amount} MT\n`;
                        iText += `   - Vencimento: ${new Date(inv.dueDate).toLocaleDateString()}\n`;
                        iText += `   - Ref: ${inv.month}/${inv.year}\n\n`;
                    });
                    iText += `_Para pagar uma fatura, selecione o grupo correspondente no menu de grupos._`;
                    return sock.sendMessage(remoteJid, { text: iText });
                } catch (e) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ Erro ao consultar faturas." });
                }

            case '3': // EMPRÉSTIMOS
                try {
                    const statusResp = await botApi.getStatus(phone);
                    const loans = statusResp.data.activeLoans || [];
                    if (loans.length === 0) {
                        return sock.sendMessage(remoteJid, { text: "💰 Você não tem empréstimos ativos no momento." });
                    }
                    let lText = `💰 *SEUS EMPRÉSTIMOS*\n\n`;
                    loans.forEach(loan => {
                        lText += `🏛️ *${loan.groupName}*\n`;
                        lText += `   - Valor: ${loan.amountRequested} MT\n`;
                        lText += `   - Em falta: ${loan.remainingBalance} MT\n`;
                        lText += `   - Progresso: ${loan.progress}%\n\n`;
                    });
                    return sock.sendMessage(remoteJid, { text: lText });
                } catch (e) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ Erro ao consultar empréstimos." });
                }

            case '4': // CONTA
                const sub = session.userData.subscription || { planName: "Grátis", endDate: "N/A", botEnabled: false };
                let msg = `👤 *DETALHES DA CONTA*\n\n`;
                msg += `📱 *Número:* ${phone}\n`;
                msg += `🎗️ *Plano:* ${sub.planName}\n`;
                msg += `📅 *Válido até:* ${sub.endDate !== "N/A" ? new Date(sub.endDate).toLocaleDateString() : "N/A"}\n`;
                msg += `🤖 *Status Bot:* ${sub.botEnabled ? "✅ Ativado" : "❌ Inativo"}\n\n`;
                msg += `_Use /id para ver detalhes técnicos de JID._`;
                return sock.sendMessage(remoteJid, { text: msg });

            case '5': // AJUDA
                delete session.step;
                return sock.sendMessage(remoteJid, { text: "Até logo! Use */menu* ou fale comigo para voltar." });

            default:
                return sock.sendMessage(remoteJid, { text: "⚠️ Opção inválida. Digite de 1 a 5." });
        }
    }

    // Step 2: Group Selection (Now from Dashboard Option 1)
    if (session.step === 'select_group') {
        if (text === '0') return showDashboard();
        
        const idx = parseInt(text) - 1;
        const group = session.userData?.groups?.[idx];
        
        if (group) {
            session.step = 'group_menu';
            session.groupId = group.id;
            session.groupName = group.name;

            let menu = `🏛️ *GRUPO: ${group.name}*\n\n`;
            menu += `O que deseja fazer?\n\n`;
            menu += `1️⃣ Ver Saldo e Dívida\n`;
            menu += `2️⃣ Pagar Quota\n`;
            menu += `3️⃣ Pedir Empréstimo\n`;
            menu += `4️⃣ Voltar aos Grupos\n`;
            menu += `5️⃣ Voltar ao Início (Dashboard)`;

            return sock.sendMessage(remoteJid, { text: menu });
        }
    }

    // Step 3: Group Menu Logic
    if (session.step === 'group_menu') {
        switch (text) {
            case '1':
                const statusResp = await botApi.getStatus(phone);
                const status = statusResp.data;
                let sMsg = `📊 *STATUS NO GRUPO: ${session.groupName}*\n\n`;
                sMsg += `💰 *Sua Poupança:* ${status.totalContribution} MT\n`;
                
                const groupLoan = status.activeLoans.find(l => l.groupName === session.groupName);
                if (groupLoan) {
                    sMsg += `\n*Dívida Ativa:*\n`;
                    sMsg += `💵 Valor: ${groupLoan.amountRequested} MT\n`;
                    sMsg += `⚠️ Restante: ${groupLoan.remainingBalance} MT\n`;
                    sMsg += `📈 Progresso: ${groupLoan.progress}% pago\n`;
                } else {
                    sMsg += `\n✅ Sem dívidas ativas neste grupo.`;
                }

                const groupInvoices = status.pendingInvoices.filter(i => i.groupName === session.groupName);
                if (groupInvoices.length > 0) {
                    sMsg += `\n\n🧾 *Faturas Pendentes:* ${groupInvoices.length}\n`;
                    groupInvoices.forEach(inv => {
                        sMsg += `- ${inv.amount} MT (${new Date(inv.dueDate).toLocaleDateString()})\n`;
                    });
                }

                return sock.sendMessage(remoteJid, { text: sMsg });

            case '2':
                session.step = 'await_payment';
                return sock.sendMessage(remoteJid, { text: "💳 *PAGAMENTO*\n\nPor favor, envie o ID da transação (ex: DBS...) e o valor pago no mesmo texto." });

            case '3':
                session.step = 'await_loan';
                return sock.sendMessage(remoteJid, { text: "🏦 *SOLICITAR EMPRÉSTIMO*\n\nQuanto deseja pedir emprestado? (Digite apenas números)" });

            case '4':
                session.step = 'select_group';
                const userG = session.userData;
                let gText = `📁 *SEUS GRUPOS*\n\n`;
                userG.groups.forEach((g, i) => {
                    gText += `*${i + 1}.* ${g.name} ${g.botEnabled ? '✅' : '❌'}\n`;
                });
                gText += `\n*0.* Voltar ao Dashboard`;
                return sock.sendMessage(remoteJid, { text: gText });

            case '5':
                return showDashboard();
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
            sock.sendMessage(remoteJid, { text: "✅ Pagamento submetido! Aguarde a confirmação do administrador." });
        } catch (err) {
            sock.sendMessage(remoteJid, { text: `❌ Erro: ${err.response?.data?.message || err.message}` });
        }
        session.step = 'group_menu';
        return;
    }

    if (session.step === 'await_loan') {
        const amount = parseInt(text);
        if (isNaN(amount)) return sock.sendMessage(remoteJid, { text: "⚠️ Valor inválido. Digite apenas números." });

        try {
            await botApi.submitLoan({
                phone,
                amount,
                groupId: session.groupId,
                notes: "Solicitado via Bot Integrado"
            });
            sock.sendMessage(remoteJid, { text: "✅ Pedido de empréstimo enviado com sucesso!" });
        } catch (err) {
            sock.sendMessage(remoteJid, { text: `❌ Erro: ${err.response?.data?.message || err.message}` });
        }
        session.step = 'group_menu';
        return;
    }

    // --- AI FALLBACK ---
    try {
        await sock.sendPresenceUpdate('composing', remoteJid);
        
        console.log(`[AI] Gerando resposta para ${phone} (Registered: ${session.isRegistered})...`);

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

        await sock.sendMessage(remoteJid, { text: aiResponse });
        await sock.sendPresenceUpdate('paused', remoteJid);
    } catch (aiErr) {
        console.error('💥 AI Error in handler:', aiErr.message);
    }
}

module.exports = handleMessage;
