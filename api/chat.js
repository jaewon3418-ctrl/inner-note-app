// api/chat.js
const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userMessage, chatHistory = [], language = 'ko' } = req.body;
    if (!userMessage) return res.status(400).json({ error: 'userMessage is required' });
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'Server configuration error.' });

    const systemMessage = {
      role: "system",
      content: language === 'ko'
        ? "너는 친구처럼 편하게 대화하는 감정 코치야. 반말로 대화하고, 공감하며 구체적인 조언을 해줘. 2-3문장으로 간결하게 답해줘."
        : "You are an empathetic friend and emotional coach. Speak warmly and provide specific advice. Keep responses to 2-3 sentences."
    };
    const historyMessages = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    const newUserMessage = { role: "user", content: userMessage };
    const messages = [systemMessage, ...historyMessages, newUserMessage];

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 300,
    });
    res.status(200).json({ response: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'Failed to get response from AI.' });
  }
};
