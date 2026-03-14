const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
require('dotenv').config();

const AI_PROVIDER = process.env.AI_PROVIDER || 'groq';

async function getGroqResponse(prompt, history = []) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1"
    });

    const messages = [
        { role: "system", content: "Você é o assistente virtual do FambaXitique. Seja educado, prestativo e fale em Português de Moçambique. Ajude os usuários com dúvidas sobre xitique, poupança e empréstimos. Se o usuário quiser fazer um pagamento ou pedido de crédito, oriente-o a usar o menu principal." },
        ...history,
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
    });

    return response.choices[0].message.content;
}

async function getGeminiResponse(prompt, history = []) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: "Você é o assistente virtual do FambaXitique. Seja educado, prestativo e fale em Português de Moçambique. Ajude os usuários com dúvidas sobre xitique, poupança e empréstimos. Se o usuário quiser fazer um pagamento ou pedido de crédito, oriente-o a usar o menu principal."
    });

    // Convert history to Gemini format if needed
    const geminiHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
}

async function getAIResponse(prompt, senderId, history = []) {
    try {
        if (AI_PROVIDER === 'gemini') {
            return await getGeminiResponse(prompt, history);
        } else {
            return await getGroqResponse(prompt, history);
        }
    } catch (err) {
        console.error(`❌ AI Error (${AI_PROVIDER}):`, err.message);
        // Fallback to the other one if primary fails
        try {
            if (AI_PROVIDER === 'groq' && process.env.GEMINI_API_KEY) {
                console.log('🔄 Swithing to Gemini fallback...');
                return await getGeminiResponse(prompt, history);
            }
        } catch (fallbackErr) {
            console.error('❌ Fallback AI Error:', fallbackErr.message);
        }
        return "Desculpe, estou com dificuldades em processar sua mensagem agora. Por favor, tente novamente em alguns instantes ou use o menu de comandos.";
    }
}

module.exports = { getAIResponse };
