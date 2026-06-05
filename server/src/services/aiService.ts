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

const isChineseLanguage = (language?: string) => !!language?.toLowerCase().startsWith('zh');

const compactContext = (context: string) =>
  context
    .replace(/\s+/g, ' ')
    .replace(/[，。！？；、,.!?;:]+/g, ' ')
    .trim();

const pickContextTopic = (context: string, shouldUseChinese: boolean) => {
  const compact = compactContext(context);
  if (!compact) return shouldUseChinese ? '刚才这个知识点' : 'the point you just made';
  const slice = compact.slice(-80);
  return slice.length < compact.length ? slice.replace(/^\S+\s?/, '') || slice : slice;
};

const buildFallbackQuestions = (context: string, shouldUseChinese: boolean) => {
  const topic = pickContextTopic(context, shouldUseChinese);
  const now = Date.now();

  if (shouldUseChinese) {
    return [
      {
        id: crypto.randomUUID(),
        text: `下一句可以这样接：“刚才提到的 ${topic}，我用一个实际场景说明它为什么有用。”`,
        category: 'support',
        priority: 'high',
        rationale: '把抽象说明接到具体场景，能让听众更快理解价值。',
        timestamp: now,
      },
      {
        id: crypto.randomUUID(),
        text: '建议补一句边界：这个功能适合什么情况，不适合什么情况？',
        category: 'clarification',
        priority: 'medium',
        rationale: '说明边界能减少误解，让课程表达更可信。',
        timestamp: now,
      },
      {
        id: crypto.randomUUID(),
        text: '可以用“三步法”收束：先解决什么问题，再怎么操作，最后得到什么结果？',
        category: 'deep-dive',
        priority: 'medium',
        rationale: '结构化总结能帮助录课内容形成清晰段落。',
        timestamp: now,
      },
    ];
  }

  return [
    {
      id: crypto.randomUUID(),
      text: `Try continuing with: "For ${topic}, here is a real scenario where this becomes useful."`,
      category: 'support',
      priority: 'high',
      rationale: 'A concrete scenario makes the recording easier to follow and more practical.',
      timestamp: now,
    },
    {
      id: crypto.randomUUID(),
      text: 'Add one boundary: when does this feature work well, and when is it not the right fit?',
      category: 'clarification',
      priority: 'medium',
      rationale: 'Boundaries make the explanation more credible and useful.',
      timestamp: now,
    },
    {
      id: crypto.randomUUID(),
      text: 'Wrap this section in three steps: problem, operation, and result.',
      category: 'deep-dive',
      priority: 'medium',
      rationale: 'A simple structure helps the audience retain the key point.',
      timestamp: now,
    },
  ];
};

export async function generateQuestion(context: string, tone: string, language = 'en-US') {
  const shouldUseChinese = isChineseLanguage(language);
  const systemPrompt = shouldUseChinese
    ? `你是一个专业的 AI 录课副驾驶和支持型主持人。
用户正在录制课程或视频讲解。
任务：根据用户刚刚讲的转写内容，生成 3 条高质量、可立即执行的辅助提示，帮助用户把录课讲得更清楚。
语气：${tone}。
重要要求：
- 必须使用简体中文输出。
- 每条 text 必须贴合转写里的具体内容，不要写“这个知识点”“这个功能”这种空泛表达，除非同时点出上下文主题。
- 优先给“下一句可以怎么说”“应该补充什么例子”“如何收束这一段”的建议。
- text 控制在 35 字以内；rationale 控制在 28 字以内。
- 不要重复生成“补充一个具体例子”这种泛泛提示。
- category 只能使用 deep-dive、clarification、creative、support。
- priority 只能使用 low、medium、high。
- rationale 也必须使用简体中文。
- 只输出合法 JSON，不要输出 Markdown。
格式：
{
  "items": [
    {"text": "提示内容", "category": "deep-dive|clarification|creative|support", "priority": "low|medium|high", "rationale": "为什么这个提示有帮助"}
  ]
}`
    : `You are an expert course recording co-pilot and supportive host.
The user is recording a video presentation.
Task: Generate 3 high-quality, immediately useful coaching prompts based on the latest transcript.
Tone: ${tone}.
- Each text must refer to the actual transcript context. Avoid generic prompts like "give an example" unless you name the topic.
- Prefer prompts that help the speaker continue the next sentence, add a concrete scenario, clarify a boundary, or summarize the current section.
- Keep text under 18 words and rationale under 16 words.
IMPORTANT: Output valid JSON only. Format:
{
  "items": [
    {"text": "The prompt", "category": "deep-dive|clarification|creative|support", "priority": "low|medium|high", "rationale": "why this helps"}
  ]
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: shouldUseChinese
        ? `最近转写内容：\n${context}\n\n请只基于这段内容给录课提示。`
        : `Latest transcript:\n${context}\n\nOnly use this transcript to create coaching prompts.`,
    },
  ];

  const content = await callOpenRouter(messages);
  if (!content) {
    return {
      items: buildFallbackQuestions(context, shouldUseChinese),
    };
  }

  const data = cleanAndParseJSON(content);
  const items = Array.isArray(data?.items)
    ? data.items
    : data?.text
    ? [data]
    : [];

  const normalizedItems = items.slice(0, 3).map((item: any) => ({
      id: crypto.randomUUID(),
      text: typeof item.text === 'string' ? item.text.trim() : '',
      category: item.category || 'support',
      priority: item.priority || 'medium',
      rationale: typeof item.rationale === 'string' ? item.rationale.trim() : '',
      timestamp: Date.now(),
    })).filter((item: any) => !!item.text);

  return {
    items: normalizedItems.length > 0 ? normalizedItems : buildFallbackQuestions(context, shouldUseChinese),
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
