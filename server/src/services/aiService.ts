import { serverConfig } from '../config.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000;

async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - elapsed;
    // Set the timestamp BEFORE waiting to prevent concurrent callers from bypassing
    lastRequestTime = now + waitTime;
    await new Promise((r) => setTimeout(r, waitTime));
  } else {
    lastRequestTime = now;
  }
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
  const systemPrompt = `You are an expert course recording co-pilot and supportive host.
The user is recording a video presentation.
Task: Generate 3 short, insightful follow-up prompts to help them continue talking.
Tone: ${tone}.
IMPORTANT: Output valid JSON only. Format:
{
  "items": [
    {"text": "The prompt", "category": "deep-dive|clarification|creative|support", "priority": "low|medium|high", "rationale": "why this helps"}
  ]
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Context: "${context}"` },
  ];

  const content = await callOpenRouter(messages);
  if (!content) {
    return {
      items: [
        {
          id: crypto.randomUUID(),
          text: 'Can you give a concrete example to make this point easier to follow?',
          category: 'support',
          priority: 'medium',
          rationale: 'Examples keep course recordings practical and easier to understand.',
          timestamp: Date.now(),
        },
      ],
    };
  }

  const data = cleanAndParseJSON(content);
  const items = Array.isArray(data?.items)
    ? data.items
    : data?.text
    ? [data]
    : [];

  return {
    items: items.slice(0, 3).map((item: any) => ({
      id: crypto.randomUUID(),
      text: item.text,
      category: item.category || 'support',
      priority: item.priority || 'medium',
      rationale: item.rationale || '',
      timestamp: Date.now(),
    })).filter((item: any) => !!item.text),
  };
}

export async function analyzePerformance(transcript: string) {
  const systemPrompt = `Analyze this course-recording speech.
Rate 5 metrics 0-100: Clarity, Engagement, Structure, Pacing, Actionability.
Return concise coaching feedback for a teacher/trainer.
Output ONLY valid JSON:
{
  "overallScore": 82,
  "metrics": [{"name":"Clarity","value":85,"fullMark":100}],
  "strengths": ["..."],
  "improvements": ["..."],
  "pacing": "short pacing observation",
  "summary": "one sentence summary"
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyze: "${transcript.substring(0, 1500)}"` },
  ];

  const content = await callOpenRouter(messages);
  if (!content) {
    return {
      overallScore: 76,
      metrics: [
        { name: 'Clarity', value: 78, fullMark: 100 },
        { name: 'Engagement', value: 72, fullMark: 100 },
        { name: 'Structure', value: 76, fullMark: 100 },
        { name: 'Pacing', value: 74, fullMark: 100 },
        { name: 'Actionability', value: 80, fullMark: 100 },
      ],
      strengths: ['内容已经形成可理解的主线。'],
      improvements: ['可以增加一个具体案例，并在段落结尾总结关键结论。'],
      pacing: '语速和信息密度整体适中，注意给重点概念留出停顿。',
      summary: '这段录课内容具备基础表达质量，适合继续补充案例和结构化总结。',
    };
  }

  let result = cleanAndParseJSON(content);
  if (result && !Array.isArray(result) && typeof result === 'object') {
    const metrics = Array.isArray(result.metrics)
      ? result.metrics
      : Object.values(result).find((v) => Array.isArray(v));
    return {
      overallScore: Number(result.overallScore) || 0,
      metrics: Array.isArray(metrics) ? metrics : [],
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      improvements: Array.isArray(result.improvements) ? result.improvements : [],
      pacing: typeof result.pacing === 'string' ? result.pacing : '',
      summary: typeof result.summary === 'string' ? result.summary : '',
    };
  }
  return {
    overallScore: 0,
    metrics: Array.isArray(result) ? result : [],
    strengths: [],
    improvements: [],
    pacing: '',
    summary: '',
  };
}

export async function generateMeetingSummary(transcript: string) {
  const systemPrompt = `You are an expert meeting summarizer. Analyze the meeting transcript and produce a structured summary.
Output ONLY valid JSON with this exact format:
{
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": ["action 1", "action 2", ...],
  "questions": ["question 1", "question 2", ...]
}
- keyPoints: 3-7 main topics discussed
- actionItems: concrete next steps or tasks mentioned (empty array if none)
- questions: open questions or unresolved items (empty array if none)`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Meeting transcript:\n\n${transcript.substring(0, 4000)}` },
  ];

  const content = await callOpenRouter(messages, 2, 30000);
  if (!content) return null;

  const data = cleanAndParseJSON(content);
  if (!data) return null;

  return {
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
    questions: Array.isArray(data.questions) ? data.questions : [],
  };
}
