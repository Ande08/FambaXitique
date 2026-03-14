const botApi = require('./api');

const sessions = new Map(); // sender -> { step, userData, groupId, groupName }

async function handleMessage(sock, msg) {
    const jid = msg.key.remoteJid;
    const phone = jid.split('@')[0];
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    
    if (!text) return;

    // Command: !plano
    if (text.toLowerCase() === '!plano') {
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

    // Command: !git (Admin only - Update system)
    if (text.toLowerCase() === '!git') {
        try {
            const resp = await botApi.getUserInfo(phone);
            if (resp.data.role !== 'SUPER_ADMIN') {
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
                const output = stdout.substring(stdout.length - 500); // Last 500 chars
                sock.sendMessage(jid, { text: `✅ Atualização Concluída!\n\n*Resumo das últimas linhas:*\n\`\`\`${output}\`\`\`` });
            });
            return;
        } catch (e) {
            return sock.sendMessage(jid, { text: "⚠️ Erro ao verificar permissões de admin." });
        }
    }

    let session = sessions.get(jid);

    // Step 1: Identification
    if (!session) {
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

            sessions.set(jid, { step: 'select_group', userData: user });
            return sock.sendMessage(jid, { text: msgText });
        } catch (e) {
            return sock.sendMessage(jid, { text: "⚠️ Número não reconhecido. Registe-se em fambaxitique.com para começar." });
        }
    }

    // Step 2: Group Selection
    if (session.step === 'select_group') {
        const idx = parseInt(text) - 1;
        const group = session.userData.groups[idx];
        
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
                sessions.delete(jid);
                return handleMessage(sock, msg); // Simplified restart
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
}

module.exports = handleMessage;
