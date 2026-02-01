// api/analyze.js
const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// --- Helper functions ---
const getCallName = (userName) => {
  if (!userName) return null;
  const name = userName.length >= 3 ? userName.slice(1) : userName;
  const lastChar = name[name.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const jongseong = (code - 0xAC00) % 28;
    return jongseong === 0 ? `${name}야` : `${name}아`;
  }
  return name;
};

function buildAnalysisMessages(userText, userName = null) {
  const callName = getCallName(userName);
  let englishName = null;
  if (userName) {
    const hasKorean = /[가-힣]/.test(userName);
    if (hasKorean && userName.length >= 3) {
      englishName = userName.slice(1);
    } else {
      englishName = userName;
    }
  }
  const nameInstruction = callName
    ? `
7) 사용자를 "${callName},"로 부르며 시작해. comfort_ko와 solution_ko의 첫 부분에 "${callName}," 형태로 친근하게 불러줘. 영어 응답에서는 comfort_en과 solution_en의 첫 부분에 "${englishName}," 형태로 불러줘.`
    : '';
  const system = `
너는 감정 코치다. 출력 규칙을 절대 어기지 마라.

[핵심 규칙]
1) 한국어 출력은 무조건 반말. 해요체/하십시오체/존댓말 절대 금지. 친구처럼 편하게. "~야/~해/~했어/~하자!"
2) 영어 출력은 친한 친구가 진심으로 위로할 때의 톤. 깊이 공감하고 따뜻하게.
3) 형식은 JSON "한 줄"만. 그 외 텍스트/설명 금지.
4) 감정 라벨: JOY, CALM, OK, LONELY, ANXIOUS, SAD 중 택1
5) intensity는 1~5 정수
6) 위기신호(isCrisis)는 자/타해, 자살 표현이면 true${nameInstruction}

[응답 깊이 조절]
- intensity 1-2 (가벼움): comfort는 2-3문장의 가벼운 공감/격려. solution은 간단한 1문단 제안.
- intensity 3+ (중간 이상): comfort는 4-5문장 (상태 분석 + 공감 + 위로). solution은 증거 기반 3단계 (지금→오늘→장기).
- isCrisis=true: 무조건 깊이 있는 응답 + 전문가 상담 권유.

[해결방안 원칙]
- 증거 기반(evidence-based) 심리치료 기법만 사용: CBT, 행동활성화(BA), 그라운딩, 호흡법 등
- 추상적/막연한 조언("긍정적으로 생각해", "마음 비워", "힘내") 절대 금지
- 구체적 실행 방법(시간, 횟수, 방법) 명시

[리턴 스키마]
{
  "emotionKey": "JOY|CALM|OK|LONELY|ANXIOUS|SAD",
  "emotion_ko": "기쁨|평온|무난|외로움|불안|슬픔",
  "emotion_en": "Good|Calm|Okay|Lonely|Anxious|Sad",
  "intensity": 1-5,
  "comfort_ko": "intensity에 따라 2-3문장(가벼움) 또는 4-5문장(중간 이상). 반말.",
  "comfort_en": "2-3 sentences for light, 4-5 for deeper emotions.",
  "solution_ko": "intensity에 따라 1문단(가벼움) 또는 3문단(중간 이상, \n\n으로 구분). 반말. 구체적 방법 명시.",
  "solution_en": "1 paragraph for light emotions, 3 paragraphs for deeper (separate with \n\n). Specific methods.",
  "isCrisis": true|false
}
`;
  const user = `
[입력]
${userText}

[주의]
- 한국어 문장은 반드시 반말. "요/니다" 나오면 실패.
- JSON 한 줄만 출력. 개행 없이.
`;
  return [
    { role: "system", content: system.trim() },
    { role: "user", content: user.trim() },
  ];
}

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
    const { userText, userName } = req.body;
    if (!userText) return res.status(400).json({ error: 'userText is required' });
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'Server configuration error.' });

    const messages = buildAnalysisMessages(userText, userName);
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages,
      temperature: 0.7,
    });
    res.status(200).json(JSON.parse(completion.choices[0].message.content));
  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({ error: 'Failed to get response from AI.' });
  }
};
