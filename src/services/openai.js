// services/openai.js

// IMPORTANT: Deploy your Vercel project and put the URL here.
// It should look like 'https://your-project-name.vercel.app'
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-deeplog-proxy.vercel.app';

// Generic fetch function to handle API calls to our proxy
async function fetchFromProxy(endpoint, body) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Request failed with status ' + res.status }));
      throw new Error(errorData.error || 'API request failed');
    }

    return await res.json();
  } catch (error) {
    console.error(`Error fetching from proxy endpoint ${endpoint}:`, error);
    throw error;
  }
}

// 1. Analyze Emotion
export async function analyzeEmotion(text, isAnonymous = false, userName = null) {
  try {
    const result = await fetchFromProxy('/api/analyze', { userText: text, userName });
    
    // The server now returns the fully structured object, so we just return it.
    // Basic validation can be added here if needed.
    return {
        ...result,
        emotion: result.emotion_ko, // for backward compatibility in the app
        status: result.comfort_ko,
        comfort: result.comfort_ko,
        solution: result.solution_ko,
        action: result.solution_ko,
        detectedLang: 'ko', // This should ideally be returned from server too
    };

  } catch (error) {
    console.error('Analyze Emotion Error:', error);
    // Return a default error object
    return {
      emotionKey: 'OK',
      emotion: "무난",
      emotion_ko: "무난",
      emotion_en: "okay",
      intensity: 3,
      comfort_ko: "미안, 지금은 연결이 어려운 것 같아. 잠시 후 다시 시도해줘.",
      comfort_en: "Sorry, I'm having trouble connecting right now. Please try again later.",
      solution_ko: "연결이 복구되면, 너의 마음에 대한 깊은 분석을 제공해줄게.",
      solution_en: "Once the connection is restored, I'll provide a deep analysis of your feelings.",
      isCrisis: false,
      detectedLang: 'ko'
    };
  }
}

// 2. Chat with AI
export async function chatWithAI(userMessage, chatHistory = [], language = 'ko') {
  try {
    const data = await fetchFromProxy('/api/chat', { userMessage, chatHistory, language });
    return data.response || (language === 'ko' ? "미안, 지금은 답변하기 어려워." : "Sorry, I can't respond right now.");
  } catch (error) {
    console.error('ChatAI Error:', error);
    throw error; // Let the calling component handle the UI update for the error
  }
}

// 3. Summarize Chat
export async function summarizeChat(chatHistory = [], language = 'ko') {
  try {
    const data = await fetchFromProxy('/api/summarize', { chatHistory, language });
    const summary = data.summary;
    return summary.length > 40 ? summary.substring(0, 40) + '...' : summary;
  } catch (error) {
    console.error('Summarize Error:', error);
    // Fallback to first message on error
    const firstUserMessage = chatHistory.find(msg => msg.role === 'user')?.text || '';
    return firstUserMessage.length > 30
      ? firstUserMessage.substring(0, 30) + '...'
      : firstUserMessage || (language === 'ko' ? '대화 기록' : 'Chat history');
  }
}
