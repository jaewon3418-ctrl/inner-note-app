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
        ? "다음 대화를 3-5단어 명사형으로 요약. 감정이 아니라 상황을 중심으로. 예: '면접 전날 긴장', '친구와 다툰 후회', '야근 후 번아웃'. 따옴표 없이 텍스트만 출력."
        : "Summarize in 3-5 words as a noun phrase. Focus on situation, not emotion. Example: 'Pre-interview nerves', 'Regret after friend argument', 'Burnout from overtime'. Output text only, no quotes."
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
