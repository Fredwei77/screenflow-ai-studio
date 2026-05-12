import { serverConfig } from '../config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000;

async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
}

function cleanAndParseJSON(text: string): any {
  try {
    let clean = text.replace(/```json\n?|\n?```/g, '').trim();
    // Try object first
    const objFirst = clean.indexOf('{');
    const objLast = clean.lastIndexOf('}');
    // Try array
    const arrFirst = clean.indexOf('[');
    const arrLast = clean.lastIndexOf(']');

    // Pick whichever JSON structure starts first
    if (arrFirst !== -1 && (objFirst === -1 || arrFirst < objFirst)) {
      clean = clean.substring(arrFirst, arrLast + 1);
    } else if (objFirst !== -1) {
      clean = clean.substring(objFirst, objLast + 1);
    }
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

async function callOpenRouter(messages: any[], retries = 2, timeoutMs = 15000): Promise<string | null> {
  if (!serverConfig.openrouterApiKey) return null;

  await waitForRateLimit();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverConfig.openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: serverConfig.aiModel,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if ((response.status >= 500 || response.status === 429) && retries > 0) {
        const wait = response.status === 429 ? 3000 * (3 - retries) : 1000;
        await new Promise((r) => setTimeout(r, wait));
        return callOpenRouter(messages, retries - 1, timeoutMs);
      }
      return null;
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name !== 'AbortError' && retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return callOpenRouter(messages, retries - 1, timeoutMs);
    }
    return null;
  }
}

export async function generateQuestion(context: string, tone: string) {
  const systemPrompt = `You are an expert interviewer and supportive co-host.
The user is recording a video presentation.
Task: Generate ONE short, insightful follow-up question to help them continue talking.
Tone: ${tone}.
IMPORTANT: Output valid JSON only. Format: {"text": "The question", "category": "deep-dive|clarification|creative|support"}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Context: "${context}"` },
  ];

  const content = await callOpenRouter(messages);
  if (!content) return null;

  const data = cleanAndParseJSON(content);
  if (!data?.text) return null;

  return {
    id: crypto.randomUUID(),
    text: data.text,
    category: data.category || 'support',
    timestamp: Date.now(),
  };
}

export async function analyzePerformance(transcript: string) {
  const systemPrompt = `Analyze this speech for a presentation.
Rate 3 metrics 0-100: Clarity, Engagement, Structure.
Output ONLY a JSON array: [{"name":"Clarity","value":85,"fullMark":100},...]`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyze: "${transcript.substring(0, 1500)}"` },
  ];

  const content = await callOpenRouter(messages);
  if (!content) {
    return [
      { name: 'Clarity', value: 75, fullMark: 100 },
      { name: 'Engagement', value: 70, fullMark: 100 },
      { name: 'Structure', value: 80, fullMark: 100 },
    ];
  }

  let result = cleanAndParseJSON(content);
  if (result && !Array.isArray(result) && typeof result === 'object') {
    const arr = Object.values(result).find((v) => Array.isArray(v));
    if (arr) result = arr;
  }
  return Array.isArray(result) ? result : [];
}
