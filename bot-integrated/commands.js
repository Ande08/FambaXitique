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

    // --- KEYWORD NAVIGATION (AUTO-STEP) ---
    const lowerText = text.toLowerCase();
    if (session.isRegistered && !session.step) {
        if (lowerText.includes('meus grupos') || (lowerText.includes('ver') && lowerText.includes('grupo'))) {
            text = '1'; session.step = 'dashboard';
        } else if (lowerText.includes('minhas faturas') || lowerText.includes('ver faturas') || lowerText.includes('pendentes')) {
            text = '2'; session.step = 'dashboard';
        } else if (lowerText.includes('meus empréstimos') || lowerText.includes('ver empréstimo') || lowerText.includes('dívida')) {
            text = '3'; session.step = 'dashboard';
        } else if (lowerText.includes('minha conta') || lowerText.includes('meu plano') || lowerText.includes('ver plano')) {
            text = '4'; session.step = 'dashboard';
        } else if (lowerText.includes('suporte') || lowerText.includes('ajuda') || lowerText.includes('atendente')) {
            if (lowerText.includes('suporte')) { text = '6'; session.step = 'dashboard'; }
            else { text = '/ajuda'; }
        }
    }

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
            const sub = user.subscription || { planName: "Grátis", endDate: null, botEnabled: false };
            const isFree = sub.planName.toLowerCase().includes('grátis') || sub.planName.toLowerCase().includes('gratuito');
            const date = isFree ? "Vitalício" : (sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "N/A");
            
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
        dash += `5️⃣ *Sair*\n`;
        dash += `6️⃣ *Suporte Técnico* 🆘\n\n`;
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
                    const allInvoices = statusResp.data.pendingInvoices || [];
                    const eligibleInvoices = allInvoices.filter(inv => inv.botEnabled);
                    
                    if (eligibleInvoices.length === 0) {
                        let msg = "✅ Você não tem faturas pendentes nos seus grupos integrados ao Bot.";
                        if (allInvoices.length > 0) {
                            msg += "\n\n⚠️ *Nota:* Você possui faturas em grupos que não têm o Bot Ativo. Visite o site para ver todas as faturas.";
                        }
                        return sock.sendMessage(remoteJid, { text: msg });
                    }

                    let iText = `🧾 *FATURAS PENDENTES*\n\n`;
                    eligibleInvoices.forEach((inv, i) => {
                        iText += `*${i + 1}.* ${inv.groupName}\n`;
                        iText += `   - Valor: ${inv.amount} MT\n`;
                        iText += `   - Vencimento: ${new Date(inv.dueDate).toLocaleDateString()}\n`;
                        iText += `   - Ref: ${inv.month}/${inv.year}\n\n`;
                    });

                    if (eligibleInvoices.length < allInvoices.length) {
                        iText += `⚠️ *Nota:* Mostrando apenas grupos com Bot Ativo. Existem outras faturas no site.\n\n`;
                    }

                    iText += `*Digite o número da fatura* que deseja pagar agora, ou *0* para voltar.`;
                    session.step = 'select_invoice_to_pay';
                    session.tempInvoices = eligibleInvoices;
                    return sock.sendMessage(remoteJid, { text: iText });
                } catch (e) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ Erro ao consultar faturas." });
                }

            case '3': // EMPRÉSTIMOS
                try {
                    const statusResp = await botApi.getStatus(phone);
                    const loans = statusResp.data.activeLoans || [];
                    // Filter loans by botEnabled if needed, but for now let's show all and check group in next step
                    if (loans.length === 0) {
                        return sock.sendMessage(remoteJid, { text: "💰 Você não tem empréstimos ativos no momento." });
                    }
                    let lText = `💰 *SEUS EMPRÉSTIMOS*\n\n`;
                    loans.forEach((loan, i) => {
                        lText += `*${i + 1}.* ${loan.groupName}\n`;
                        lText += `   - Valor: ${loan.amountRequested} MT\n`;
                        lText += `   - Em falta: ${loan.remainingBalance} MT\n`;
                        lText += `   - Progresso: ${loan.progress}%\n\n`;
                    });

                    lText += `*Digite o número do empréstimo* que deseja amortizar, ou *0* para voltar.`;
                    session.step = 'select_loan_to_pay';
                    session.tempLoans = loans;
                    return sock.sendMessage(remoteJid, { text: lText });
                } catch (e) {
                    return sock.sendMessage(remoteJid, { text: "⚠️ Erro ao consultar empréstimos." });
                }

            case '4': // CONTA
                const sub = session.userData.subscription || { planName: "Grátis", endDate: null, botEnabled: false };
                const isFree = sub.planName.toLowerCase().includes('grátis') || sub.planName.toLowerCase().includes('gratuito');
                const date = isFree ? "Vitalício" : (sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "N/A");

                let msg = `👤 *DETALHES DA CONTA*\n\n`;
                msg += `📱 *Número:* ${phone}\n`;
                msg += `🎗️ *Plano:* ${sub.planName}\n`;
                msg += `📅 *Válido até:* ${date}\n`;
                msg += `🤖 *Status Bot:* ${sub.botEnabled ? "✅ Ativado" : "❌ Inativo"}\n\n`;
                msg += `_Use /id para ver detalhes técnicos de JID._`;
                return sock.sendMessage(remoteJid, { text: msg });

            case '5': // SAIR
                delete session.step;
                return sock.sendMessage(remoteJid, { text: "Até logo! Use */menu* ou fale comigo para voltar." });

            case '6': // SUPORTE
                session.step = 'await_support_phone';
                return sock.sendMessage(remoteJid, { text: "🆘 *SUPORTE TÉCNICO*\n\nPor favor, digite o número de telefone (com 258) para que a nossa equipa possa entrar em contacto consigo o mais breve possível." });

            default:
                return sock.sendMessage(remoteJid, { text: "⚠️ Opção inválida. Digite de 1 a 6." });
        }
    }

    // PAYMENT FLOW HANDLERS
    if (session.step === 'select_invoice_to_pay' || session.step === 'select_loan_to_pay') {
        if (text === '0') return showDashboard();
        const idx = parseInt(text) - 1;
        const items = session.step === 'select_invoice_to_pay' ? session.tempInvoices : session.tempLoans;
        
        if (isNaN(idx) || !items || !items[idx]) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Opção inválida. Escolha um número da lista." });
        }

        const selected = items[idx];
        session.paymentData = {
            groupId: selected.groupId || session.userData.groups.find(g => g.name === selected.groupName)?.id,
            amount: selected.amount || selected.remainingBalance,
            invoiceId: selected.id && session.step === 'select_invoice_to_pay' ? selected.id : null,
            loanId: selected.id && session.step === 'select_loan_to_pay' ? selected.id : null,
            groupName: selected.groupName
        };

        try {
            // Get group details to show payment methods
            const userResp = await botApi.getUserInfo(phone); // Re-fetch or use session to get group methods
            const groupDetails = userResp.data.groups.find(g => g.id === session.paymentData.groupId);
            
            // We need to fetch the FULL group object to get paymentMethods JSON
            // Let's add an endpoint or reuse getUserInfo if it has it. 
            // For now, let's assume we have them or show default.
            
            let pmText = `💳 *MÉTODOS DE PAGAMENTO - ${session.paymentData.groupName}*\n\n`;
            pmText += `Escolha como deseja pagar o valor de *${session.paymentData.amount} MT*:\n\n`;
            pmText += `1️⃣ M-Pesa\n`;
            pmText += `2️⃣ e-Mola\n\n`;
            pmText += `*0.* Cancelar`;
            
            session.step = 'select_payment_method';
            return sock.sendMessage(remoteJid, { text: pmText });
        } catch (e) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Erro ao carregar métodos de pagamento." });
        }
    }

    if (session.step === 'select_payment_method') {
        if (text === '0') return showDashboard();
        const method = text === '1' ? 'M-Pesa' : (text === '2' ? 'e-Mola' : null);
        if (!method) return sock.sendMessage(remoteJid, { text: "⚠️ Escolha 1 ou 2." });

        session.paymentData.method = method;
        session.step = 'await_transaction_id';
        return sock.sendMessage(remoteJid, { text: `📝 *PAGAMENTO VIA ${method.toUpperCase()}*\n\nPor favor, realize a transferência e digite aqui o *ID da Transação* (ex: 9ABC...):` });
    }

    if (session.step === 'await_transaction_id') {
        if (text.length < 5) return sock.sendMessage(remoteJid, { text: "⚠️ ID de transação inválido. Introduza o código completo recebido por SMS." });

        try {
            await sock.sendMessage(remoteJid, { text: "⏳ Processando seu pagamento... Por favor, aguarde." });
            
            const resp = await botApi.submitPayment({
                phone,
                amount: session.paymentData.amount,
                transactionId: text,
                groupId: session.paymentData.groupId,
                invoiceId: session.paymentData.invoiceId,
                loanId: session.paymentData.loanId,
                paymentMethod: session.paymentData.method,
                notes: `Pago via Bot WhatsApp (${session.paymentData.method})`
            });

            const successMsg = `✅ *PAGAMENTO REGISTADO!*\n\nObrigado, *${session.userData.firstName}*! O seu pagamento de *${session.paymentData.amount} MT* foi submetido.\n\n📢 O administrador do grupo *${session.paymentData.groupName}* foi notificado e irá validar o comprovativo em breve.`;
            
            delete session.step;
            delete session.paymentData;
            return sock.sendMessage(remoteJid, { text: successMsg });
        } catch (e) {
            const errorMsg = e.response?.data?.message || "Erro ao processar pagamento.";
            return sock.sendMessage(remoteJid, { text: `❌ *ERRO:* ${errorMsg}\n\nVerifique o ID da transação e tente novamente.` });
        }
    }

    // SUPPORT FLOW HANDLER
    if (session.step === 'await_support_phone') {
        const supportPhone = text.replace(/\D/g, '');
        if (supportPhone.length < 9) {
            return sock.sendMessage(remoteJid, { text: "⚠️ Número inválido. Por favor, digite o número completo (ex: 25884...)." });
        }

        try {
            await botApi.submitSupportRequest({
                phone,
                senderName: session.userData.firstName,
                supportPhone
            });
            sock.sendMessage(remoteJid, { text: "✅ *Pedido Enviado!* O Administrator Supremo foi notificado e entrará em contacto consigo em breve no número fornecido. Obrigado pela paciência!" });
        } catch (e) {
            sock.sendMessage(remoteJid, { text: "❌ Erro ao processar suporte. Por favor, tente novamente mais tarde." });
        }
        delete session.step;
        return;
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
