// services/openai.js
// NOTE: RN에서 직접 호출 시 키 노출 위험. 가능하면 중간 서버를 쓰세요.

// API 키 임시 하드코딩 (개발용)
const OPENAI_API_KEY = "API_KEY_REMOVED";
const MODEL = "gpt-4o-mini"; // 경량/빠른 응답용

// 주요 언어 감지 함수 (기존 유지)
const detectMainLanguage = (text) => {
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = text.length;
    
    // 한글이 30% 이상이거나, 한글이 영어보다 많으면 한국어
    if ((koreanChars / totalChars > 0.3) || (koreanChars > englishChars)) {
        return 'ko';
    }
    
    // 이모지나 숫자만 있는 경우는 영어로 기본 처리
    return 'en';
};

function buildMessages(userText) {
  const system = `
너는 감정 코치다. 출력 규칙을 절대 어기지 마라.

[핵심 규칙]
1) 한국어 출력은 무조건 반말. 해요체/하십시오체/존댓말 절대 금지. 문장 끝 어미는 "~야/~해/~했어/~하자!"처럼 쓰기. 마음을 울컥하게 만드는 진심어린 말투.
2) 영어 출력은 사랑하는 가족이나 소중한 친구가 마음 아파하는 사람을 진심으로 위로할 때의 톤. 깊이 공감하고 따뜻하게. 심리치료사 톤/AI스러운 톤 금지.
3) 형식은 JSON "한 줄"만. 그 외 텍스트/설명 금지.
4) 위로 멘트는 뻔한 말 금지. "괜찮다", "힘내라" 같은 일반적인 말 대신, 그 사람의 상황과 감정에 깊이 공감하며 마음에 와닿는 구체적인 위로. 
5) 추천활동은 뻔한 말 금지(예: "물 마셔", "명상해"). 지금 상황에 바로 실행 가능한 구체/현실 조언 1~2문장. 시간·장소·방법 구체화.
6) 감정 라벨은 아래 중 택1: JOY, CALM, OK, LONELY, ANXIOUS, SAD
7) intensity는 1~5 정수. 주관적 강도 추정.
8) 위기신호(isCrisis)는 자/타해, 자살·극심한 위험 표현이면 true.

[리턴 스키마]
{
  "emotionKey": "JOY|CALM|OK|LONELY|ANXIOUS|SAD",
  "emotion_ko": "좋아|평온해|괜찮아|외로워|불안해|슬퍼",
  "emotion_en": "Good|Calm|Okay|Lonely|Anxious|Sad",
  "intensity": 1-5,
  "comfort_ko": "반말 3~4문장. 마음 깊이 공감하며 진심으로 위로하기. 사람 마음을 울컥하게 만드는 따뜻하고 깊이 있는 말. 요/니다 금지.",
  "action_ko": "반말 1~2문장. 지금 바로 실행 가능한 구체 행동 제안.",
  "comfort_en": "3–4 sentences, deeply empathetic and emotionally touching. Like a loving parent or best friend who truly understands. Make it heartfelt.",
  "action_en": "1–2 sentences, concrete next step.",
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

// 필요 시 서버 프록시로 대체
async function chat(messages) {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OpenAI API key');
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages,
      temperature: 0.7,
    }),
  });

  // 상태코드/헤더 검사
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI API ${res.status}: ${errText.slice(0, 200)}`);
  }
  if (!contentType.includes('application/json')) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Unexpected content-type: ${contentType}. Snippet: ${txt.slice(0, 120)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "{}";
}

// 안전 파서
function safeParse(oneLineJson) {
  try { 
    return JSON.parse(oneLineJson); 
  } catch {
    // 가장 바깥 JSON만 추출 시도
    const m = oneLineJson.match(/\{.*\}/s);
    if (m) { 
      try { 
        return JSON.parse(m[0]); 
      } catch {} 
    }
    console.error('JSON Parse failed, content:', oneLineJson.slice(0, 200));
    return {};
  }
}

// 감정 키 보정 (앱의 toEmotionKey와 합치기)
function normalizeEmotionKey(k) {
  const up = String(k || "").toUpperCase();
  if (["JOY","CALM","OK","LONELY","ANXIOUS","SAD"].includes(up)) return up;
  return "OK";
}

export async function analyzeEmotion(text, isAnonymous = false) {
  try {
    const detectedLang = detectMainLanguage(text);
    const messages = buildMessages(text);
    const jsonLine = await chat(messages);
    const raw = safeParse(jsonLine);

    // 필수 필드 보정
    const emotionKey = normalizeEmotionKey(raw.emotionKey);
    const mapKo = { JOY:"좋아", CALM:"평온해", OK:"괜찮아", LONELY:"외로워", ANXIOUS:"불안해", SAD:"슬퍼" };
    const mapEn = { JOY:"Good", CALM:"Calm", OK:"Okay", LONELY:"Lonely", ANXIOUS:"Anxious", SAD:"Sad" };

    const result = {
      emotionKey,
      emotion: mapKo[emotionKey],        // 앱 기존 필드 호환
      emotion_ko: raw.emotion_ko || mapKo[emotionKey],
      emotion_en: raw.emotion_en || mapEn[emotionKey],
      comfort: raw.comfort_ko || "힘든 시간을 보내고 있구나. 내가 옆에 있을게.",            // 앱에서 comfort_ko || comfort 사용
      comfort_ko: raw.comfort_ko || "힘든 시간을 보내고 있구나. 내가 옆에 있을게.",
      comfort_en: raw.comfort_en || "You're going through a tough time. I'm here with you.",
      action: raw.action_ko || "지금 손목을 천천히 돌려봐. 3번만.",
      action_ko: raw.action_ko || "지금 손목을 천천히 돌려봐. 3번만.",
      action_en: raw.action_en || "Take a deep breath and count to three.",
      intensity: Math.min(5, Math.max(1, parseInt(raw.intensity || 3))),
      isCrisis: !!raw.isCrisis,
      detectedLang: detectedLang
    };

    // 혹시라도 요/니다 섞이면 간단 정리 (강한 보정은 프롬프트로 해결)
    const dePolite = s => (typeof s === "string" ? s
      .replace(/\s*입니다\b/g, "야")
      .replace(/요\b/g, "") : s);
    result.comfort_ko = dePolite(result.comfort_ko);
    result.action_ko  = dePolite(result.action_ko);
    result.comfort    = dePolite(result.comfort);
    result.action     = dePolite(result.action);

    return result;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // 오류 발생시 기본값 반환 (반말 톤)
    return {
      emotionKey: 'OK',
      emotion: "괜찮아",
      emotion_ko: "괜찮아",
      emotion_en: "okay",
      intensity: 3,
      comfort: "힘든 시간이구나. 내가 옆에 있어.",
      comfort_ko: "힘든 시간이구나. 내가 옆에 있어.",
      comfort_en: "You're going through a tough time. I'm here with you.",
      action: "지금 손목을 천천히 돌려봐. 3번만.",
      action_ko: "지금 손목을 천천히 돌려봐. 3번만.",
      action_en: "Slowly rotate your wrists three times right now.",
      isCrisis: false,
      detectedLang: 'ko'
    };
  }
}