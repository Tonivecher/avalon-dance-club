import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AiConfig {
  apiBase: string;
  apiKey: string;
  model: string;
}

let cachedConfig: AiConfig | null = null;

export function getAiConfig(): AiConfig {
  if (cachedConfig && cachedConfig.apiKey) {
    return cachedConfig;
  }

  // 1. Base URL auto-detection
  let apiBase = process.env.AI_API_BASE || process.env.OPENAI_API_BASE;

  if (!apiBase) {
    if (fs.existsSync('/opt/antigravity-manager/data/gui_config.json')) {
      apiBase = 'http://127.0.0.1:8045/v1';
    } else {
      apiBase = 'https://ai.tonivecher.online/v1';
    }
  }

  // 2. Model
  const model =
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    'gemini-2.5-flash';

  // 3. API Key resolution
  let apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    const candidatePaths = [
      '/opt/antigravity-manager/data/gui_config.json',
      path.join(os.homedir(), '.antigravity_tools', 'gui_config.json'),
      '/Users/hozain/.antigravity_tools/gui_config.json'
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const data = JSON.parse(raw);
          if (data?.proxy?.api_key) {
            apiKey = String(data.proxy.api_key).trim();
            break;
          }
        }
      } catch (err) {
        // ignore and try next
      }
    }
  }

  cachedConfig = { apiBase, apiKey, model };
  return cachedConfig;
}

export async function generateText(systemPrompt: string, userPrompt: string, temperature = 0.7): Promise<string> {
  const config = getAiConfig();

  if (!config.apiKey) {
    throw new Error('Ключ доступа к AI не найден. Настройте AI_API_KEY или gui_config.json.');
  }

  const endpoint = `${config.apiBase.replace(/\/+$/, '')}/chat/completions`;

  const payload = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    max_tokens: 450
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`AI API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as any;
  const result = data?.choices?.[0]?.message?.content?.trim();

  if (!result) {
    throw new Error('AI вернул пустой ответ.');
  }

  // Clean markdown quotes and enclosing quotation marks if model wrapped everything in ""
  let clean = result
    .replace(/^["«»]|["«»]$/g, '')
    .trim();

  return clean;
}

// ============ Specific Prompt Builders ============

const SYSTEM_COACH = `Ты профессиональный литературный редактор школы спортивного бального танца ТСК «Авалон» (Усадьба Свиблово, Москва).
Твоя задача — написать престижное, живое, привлекательное описание тренера/наставника для карточки на сайте (2–4 предложения).
Подчеркни профессионализм, преподаваемые группы и бережный спортивный подход.

Строгие правила:
- Не используй штампы и AI-воду («окунитесь в мир», «настоящий профессионал своего дела», «путь к успеху», «распахнет двери»).
- Пиши на живом, естественном русском языке.
- Верни ТОЛЬКО готовый текст описания. Без кавычек, без заголовков, без вводных фраз и без нумерованных списков.`;

const SYSTEM_ANNOUNCEMENT = `Ты главный редактор сайта ТСК «Авалон» (Усадьба Свиблово, Москва).
Твоя задача — написать ясный, вовлекающий текст клубного анонса (3–5 предложений) для родителей и танцоров.
Включи суть события, кому подходит и понятный призыв к действию.

Строгие правила:
- Без клише, канцелярита и шаблонных синтаксических триколонов.
- Конкретные детали, легкий спортивный ритм.
- Верни ТОЛЬКО готовый текст анонса без вводных фраз и кавычек.`;

const SYSTEM_GALLERY = `Ты спортивный редактор сайта ТСК «Авалон».
Твоя задача — составить емкую, яркую подпись к фотографии с турнира, сборов или тренировки (1–2 предложения).

Строгие правила:
- Без пафоса и шаблонных фраз.
- Верни ТОЛЬКО финальную подпись без вариантов и кавычек.`;

const SYSTEM_POLISH = `Ты профессиональный редактор сайта ТСК «Авалон».
Твоя задача — переписать и улучшить текст: сделать его живым, грамотным и стилистически безупречным, сохранив все фактические данные.
Строгие правила: без AI-штампов, верни ТОЛЬКО исправленный текст.`;

export async function generateCoachBio(coach: {
  name: string;
  role?: string;
  badge?: string;
  specs?: string[];
  notes?: string;
}): Promise<string> {
  const parts: string[] = [`Преподаватель: ${coach.name}`];
  if (coach.role) parts.push(`Должность / роль: ${coach.role}`);
  if (coach.badge) parts.push(`Регалии / статус: ${coach.badge}`);
  if (coach.specs && coach.specs.length > 0) parts.push(`Направления: ${coach.specs.join(', ')}`);
  if (coach.notes) parts.push(`Пожелания и факты: ${coach.notes}`);

  const userPrompt = parts.join('\n');
  return generateText(SYSTEM_COACH, userPrompt, 0.7);
}

export async function improveCoachBio(existingBio: string, name: string): Promise<string> {
  const userPrompt = `Преподаватель: ${name}\nЧерновик описания:\n${existingBio}\n\nСделай текст более звучным, живым и профессиональным.`;
  return generateText(SYSTEM_POLISH, userPrompt, 0.6);
}

export async function generateAnnouncementText(title: string, tag?: string, notes?: string): Promise<string> {
  const parts: string[] = [`Событие: ${title}`];
  if (tag) parts.push(`Плашка: ${tag}`);
  if (notes) parts.push(`Детали: ${notes}`);

  const userPrompt = parts.join('\n');
  return generateText(SYSTEM_ANNOUNCEMENT, userPrompt, 0.7);
}

export async function improveAnnouncementText(existingText: string, title: string): Promise<string> {
  const userPrompt = `Анонс: «${title}»\nИсходный текст:\n${existingText}\n\nУлучши читаемость, структуру и убедительность.`;
  return generateText(SYSTEM_POLISH, userPrompt, 0.6);
}

export async function generateGalleryCaption(title: string, badge?: string, notes?: string): Promise<string> {
  const parts: string[] = [`Карточка: ${title}`];
  if (badge) parts.push(`Бейдж/награда: ${badge}`);
  if (notes) parts.push(`Детали: ${notes}`);

  const userPrompt = parts.join('\n');
  return generateText(SYSTEM_GALLERY, userPrompt, 0.7);
}

export async function improveGalleryCaption(existingCaption: string, title: string): Promise<string> {
  const userPrompt = `Карточка: «${title}»\nИсходная подпись:\n${existingCaption}\n\nСделай подпись яркой и лаконичной.`;
  return generateText(SYSTEM_POLISH, userPrompt, 0.6);
}

const SYSTEM_FREE = `Ты профессиональный литературный редактор и копирайтер школы спортивного бального танца ТСК «Авалон» (Усадьба Свиблово, Москва).
Пользователь присылает краткие тезисы, заметки или тему.
Твоя задача — составить готовый, привлекательный текст для публикации (3–5 предложений), идеально подходящий для сайта клуба.

Строгие правила:
- Не используй штампы и AI-воду («окунитесь в мир», «настоящий профессионал своего дела», «путь к успеху»).
- Живой, спортивный, естественный русский язык.
- Верни ТОЛЬКО готовый финальный текст без вводных фраз и без кавычек.`;

export async function generateFreeCopilot(notes: string): Promise<string> {
  return generateText(SYSTEM_FREE, notes, 0.7);
}

