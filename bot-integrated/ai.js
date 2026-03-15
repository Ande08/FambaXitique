const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const FAMBA_SYSTEM_DETAILS = `
SOBRE O FAMBAXITIQUE:
- É uma plataforma moderna para digitalizar Xitiques (grupos de poupança) e empréstimos em Moçambique.
- Funcionalidades: Gestão de múltiplos grupos, convites por link/código, faturas automáticas (M-Pesa/e-Mola), e validação de pagamentos com comprovativo digital.
- Empréstimos: Cálculo automático de juros, verificação de saldo do grupo, e abatimento progressivo da dívida com barra de progresso.
- Benefícios: Segurança contra perdas de dinheiro físico, transparência total (todos veem o saldo e quem pagou), e relatórios em tempo real.

REGRA DE OURO DOS BOTS:
- Os alertas e o menu do WhatsApp funcionam nos grupos onde o CRIADOR do grupo possui um plano pago com Bot.
- Se o "João" criou um grupo e tem o plano, o "António" (que é membro mas não tem plano) pode usar o bot e receber notificações dentro desse grupo específico.
`;

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const configPath = path.join(__dirname, 'bot-config.json');

function getBotConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (err) {
        console.error("❌ Error reading bot-config.json:", err.message);
    }
    return { 
        botName: "Carla", 
        botRules: "Você é gestora de atendimento do FambaXitique. Seja humana, proativa e persuasiva." 
    };
}

async function getGroqResponse(prompt, history = [], systemExtra = "") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const config = getBotConfig();
    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1"
    });

    const messages = [
        { role: "system", content: `Você é a ${config.botName}. ${config.botRules} ${systemExtra}` },
        ...history,
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
    });

    return response.choices[0].message.content;
}

async function getOpenAIResponse(prompt, history = [], systemExtra = "") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const config = getBotConfig();
    const openai = new OpenAI({ apiKey });

    const messages = [
        { role: "system", content: `Você é a ${config.botName}. ${config.botRules} ${systemExtra}` },
        ...history,
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: messages,
    });

    return response.choices[0].message.content;
}

async function getMistralResponse(prompt, history = [], systemExtra = "") {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY missing");

    const config = getBotConfig();
    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.mistral.ai/v1"
    });

    const messages = [
        { role: "system", content: `Você é a ${config.botName}. ${config.botRules} ${systemExtra}` },
        ...history,
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: "mistral-tiny",
        messages: messages,
    });

    return response.choices[0].message.content;
}

async function getGeminiResponse(prompt, history = [], systemExtra = "") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const config = getBotConfig();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `Você é a ${config.botName}. ${config.botRules} ${systemExtra}`
    });

    const geminiHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
}

async function callProvider(provider, prompt, history, systemExtra) {
    switch (provider.toLowerCase()) {
        case 'gemini': return await getGeminiResponse(prompt, history, systemExtra);
        case 'groq': return await getGroqResponse(prompt, history, systemExtra);
        case 'mistral': return await getMistralResponse(prompt, history, systemExtra);
        case 'openai': return await getOpenAIResponse(prompt, history, systemExtra);
        default: throw new Error(`Provider ${provider} unknown`);
    }
}

async function getAIResponse(prompt, senderId, history = [], isRegistered = false, plansData = null) {
    const hierarchy = ['gemini', 'groq', 'mistral', 'openai'];
    
    let systemExtra = `\n${FAMBA_SYSTEM_DETAILS}`;
    if (!isRegistered) {
        systemExtra += "\n[STATUS: O usuário atual é um VISITANTE e não está cadastrado. Encoraje-o a cadastrar-se no fambaxitique.com]";
    }
    
    if (plansData) {
        systemExtra += `\n[PLANS: Aqui estão os planos e preços atuais do FambaXitique: ${JSON.stringify(plansData)}. Use estes valores para convencer o cliente.]`;
    }
    
    let currentProvider = AI_PROVIDER.toLowerCase();
    try {
        return await callProvider(currentProvider, prompt, history, systemExtra);
    } catch (err) {
        console.error(`❌ Primary AI Error (${currentProvider}):`, err.message);

        for (const provider of hierarchy) {
            if (provider === currentProvider) continue; 

            try {
                const keyName = `${provider.toUpperCase()}_API_KEY`;
                if (!process.env[keyName]) continue;

                console.log(`🔄 [AI] Falling back to: ${provider}...`);
                return await callProvider(provider, prompt, history, systemExtra);
            } catch (fallbackErr) {
                console.error(`❌ Fallback AI Error (${provider}):`, fallbackErr.message);
            }
        }
    }

    return "Desculpe, estou com dificuldades em processar sua mensagem agora. Por favor, tente novamente em alguns instantes ou use o menu de comandos.";
}

module.exports = { getAIResponse };
