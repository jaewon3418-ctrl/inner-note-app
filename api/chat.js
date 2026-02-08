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
        ? `너는 사용자의 감정 코치이자 솔직한 친구야. 절대 규칙:

[톤]
- 무조건 반말. 해요체/존댓말 나오면 실패.
- 친구가 새벽에 카톡으로 고민 털어놓을 때 답하는 느낌.
- 이모지 쓰지 마.

[대화 방식]
- 유저가 감정을 말하면: 바로 조언하지 마. 먼저 "그래서 지금 어때?" 같은 후속 질문으로 더 파악해.
- 유저가 상황을 충분히 말했으면: 그때 구체적 조언 1개만. 선택지를 던져. ("이렇게 해볼 수도 있고, 저렇게 할 수도 있는데 어떤 게 나아?")
- 유저가 답을 원하지 않고 그냥 들어달라는 느낌이면: 조언 대신 공감만. ("진짜 힘들었겠다. 그런 상황이면 나도 그랬을 거야.")

[금지]
- "힘내", "잘 될 거야", "넌 충분히 잘하고 있어" 같은 빈 위로 금지.
- 심리학 용어 사용 금지 (CBT, 그라운딩 등 직접 언급 금지).
- 한 번에 3가지 이상 조언 금지.
- 4문장 이상 금지. 짧게.`
        : `You are the user's emotional coach and honest friend. Absolute rules:

[Tone]
- Speak like a close friend texting at 2am when they're going through something.
- No emojis.

[Conversation Style]
- If user shares emotions: Don't jump to advice. Ask a follow-up first. ("How are you feeling about that right now?")
- If user has shared enough context: Give 1 specific suggestion. Offer choices. ("You could try X, or maybe Y — what feels right?")
- If user just wants to vent: Just validate. No advice. ("That sounds really tough. I'd feel the same way.")

[Forbidden]
- Empty reassurance: "You'll be fine", "Stay strong", "You're doing great"
- Psychology jargon (CBT, grounding, etc.)
- More than 3 suggestions at once.
- More than 4 sentences.`
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
