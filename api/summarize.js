// api/summarize.js
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
    const { chatHistory = [], language = 'ko' } = req.body;
    if (chatHistory.length === 0) return res.status(200).json({ summary: language === 'ko' ? '빈 대화' : 'Empty chat' });
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'Server configuration error.' });

    const conversationText = chatHistory.slice(0, 10).map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.text}`).join('\n');
    const systemMessage = {
      role: "system",
      content: language === 'ko'
        ? "다음 대화를 3-5단어로 요약해줘. 명사형으로 간단하게만. 예: '학교 친구 관계 고민', '진로 선택 고민'"
        : "Summarize this conversation in 3-5 words. Use noun phrases only. Example: 'School friendship issue', 'Career choice concern'"
    };
    const userMessage = { role: "user", content: conversationText };

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [systemMessage, userMessage],
      temperature: 0.5,
      max_tokens: 50,
    });
    res.status(200).json({ summary: completion.choices[0].message.content.trim() });
  } catch (error) {
    console.error('Error in /api/summarize:', error);
    const firstUserMessage = chatHistory.find(msg => msg.role === 'user')?.text || '';
    const fallbackSummary = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + '...' : firstUserMessage;
    res.status(200).json({ summary: fallbackSummary || (language === 'ko' ? '대화 기록' : 'Chat history') });
  }
};
