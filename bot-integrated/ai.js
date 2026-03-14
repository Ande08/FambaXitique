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

async function getOpenAIResponse(prompt, history = []) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const openai = new OpenAI({ apiKey });

    const messages = [
        { role: "system", content: "Você é o assistente virtual do FambaXitique. Seja educado, prestativo e fale em Português de Moçambique." },
        ...history,
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: messages,
    });

    return response.choices[0].message.content;
}

async function getMistralResponse(prompt, history = []) {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY missing");

    // Mistral also supports OpenAI format via their API
    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.mistral.ai/v1"
    });

    const messages = [
        { role: "system", content: "Você é o assistente virtual do FambaXitique. Seja educado e prestativo." },
        ...history,
        { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
        model: "mistral-tiny",
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
        switch (AI_PROVIDER.toLowerCase()) {
            case 'gemini':
                return await getGeminiResponse(prompt, history);
            case 'openai':
                return await getOpenAIResponse(prompt, history);
            case 'mistral':
                return await getMistralResponse(prompt, history);
            default:
                return await getGroqResponse(prompt, history);
        }
    } catch (err) {
        console.error(`❌ AI Error (${AI_PROVIDER}):`, err.message);
        
        // Dynamic Fallback Chain
        try {
            if (process.env.GROQ_API_KEY && AI_PROVIDER !== 'groq') {
                console.log('🔄 Fallback to Groq...');
                return await getGroqResponse(prompt, history);
            }
            if (process.env.GEMINI_API_KEY && AI_PROVIDER !== 'gemini') {
                console.log('🔄 Fallback to Gemini...');
                return await getGeminiResponse(prompt, history);
            }
        } catch (fallbackErr) {
            console.error('❌ Fallback AI Error:', fallbackErr.message);
        }
        return "Desculpe, estou com dificuldades em processar sua mensagem agora. Por favor, tente novamente em alguns instantes ou use o menu de comandos.";
    }
}

module.exports = { getAIResponse };
