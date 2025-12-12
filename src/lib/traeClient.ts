// ==================== imports ====================
import {
  buildPersonaGenerationPrompt,
  buildDialoguePrompt,
  dialogueSystemPrompt,
} from "./prompts/persona-and-dialogue";
import { scoringSystemPrompt, buildScoringPrompt } from "./prompts/scoring-criteria";
import { brandKnowledge } from "./knowledge/brand";
import { productLineKnowledge } from "./knowledge/product-line";
import { productKnowledge } from "./knowledge/product";
import { realisticCustomerPrompt } from "./prompts/customerRealistic";

// ==================== types ====================

export type ChatMessage = {
  role: "user" | "customer";
  text: string;
  timestamp?: string;
};

export interface EvaluationResult {
  overallScore: number;
  dimensions: {
    needsDiscovery: number;
    productKnowledge: number;
    objectionHandling: number;
    emotionalConnection: number;
    closingSkill: number;
  };
  kbInsights?: {
    usedKnowledgeItems?: string[];
    missingTopics?: string[];
  };
  feedback: string;
}

export type AppLanguage = "zh" | "en";

export interface SessionConfig {
  personaId: string;
  scenarioId: string;
  difficulty: string;
  brand?: string;
  productLine?: string;
  knowledgeBaseIds?: string[];
  scoringModelId?: string;
  language?: AppLanguage;
}

// ==================== maps (unchanged) ====================

export const PERSONA_MAP: Record<string, string> = {
  高净值顾客: "HNWI",
  旅游客: "TOURIST",
  犹豫型顾客: "HESITANT",
  礼物购买者: "GIFT",
  价格敏感型顾客: "PRICE_SENSITIVE",
};

export const SCENARIO_MAP: Record<string, string> = {
  首次进店: "FIRST_VISIT",
  "VIP 回访": "VIP_RETURN",
  购买送老板的礼物: "GIFT_FOR_BOSS",
  机场免税店场景: "DUTY_FREE",
  线上咨询: "ONLINE_CONSULT",
};

export const DIFFICULTY_MAP: Record<string, string> = {
  基础: "BASIC",
  中级: "INTERMEDIATE",
  高级: "ADVANCED",
};

// ==================== helpers ====================

function normalizeLang(lang?: string): AppLanguage {
  if (!lang) return "zh";
  return lang.toLowerCase().startsWith("en") ? "en" : "zh";
}

function containsChinese(text: string) {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 强语言锁（比你原来的 langHint 更硬）
 * - 英文模式：禁止中文输出；用户中文则提醒英文
 * - 中文模式：输出中文
 */
function languageLock(lang: AppLanguage) {
  if (lang === "en") {
    return [
      "SYSTEM LANGUAGE POLICY (STRICT):",
      "- Output must be English ONLY. Do NOT output any Chinese characters.",
      "- If the user speaks Chinese, reply: 'Please speak English.' and continue in English.",
      "- Do not translate to Chinese. Do not include bilingual content.",
      "- Keep role-play consistent: you are the customer, the user is the sales associate.",
    ].join("\n");
  }
  return [
    "系统语言规则（严格）：",
    "- 输出必须为中文。",
    "- 不要输出英文或中英混合（除非品牌/型号/专有名词）。",
    "- 你扮演顾客，用户是销售。",
  ].join("\n");
}

function jsonLock(lang: AppLanguage) {
  if (lang === "en") {
    return [
      "OUTPUT FORMAT POLICY (STRICT):",
      "- Output must be valid JSON ONLY.",
      "- Use English strings only.",
      "- No markdown, no code fences, no extra text.",
    ].join("\n");
  }
  return [
    "输出格式规则（严格）：",
    "- 只能输出合法 JSON。",
    "- 不要输出 markdown 或代码块，不要包含多余解释。",
  ].join("\n");
}

function fallbackOpening(lang: AppLanguage) {
  return lang === "en" ? "Hi, I'd like to take a look at your products." : "你好，我想看看产品。";
}

function fallbackCustomerReply(lang: AppLanguage) {
  return lang === "en"
    ? "Sorry, I didn't catch that. Could you say it again?"
    : "抱歉，我这边有点忙，刚刚没有听清楚，您可以再说一遍吗？";
}

// 兼容 ```json 代码块，尝试解析 openingStatement
function tryParsePersonaJson(raw: string): { personaDetails: string; openingStatement?: string } {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "");
    cleaned = cleaned.replace(/```$/, "").trim();
  }

  try {
    const obj = JSON.parse(cleaned);
    return {
      personaDetails: JSON.stringify(obj, null, 2),
      openingStatement: obj?.openingStatement,
    };
  } catch {
    return { personaDetails: raw };
  }
}

/**
 * 注意：你现在后端支持额外 systemPrompt（systemPrompt: realisticCustomerPrompt）
 * 很可能它的优先级更高/更“靠后”，会压过前面的语言提示。
 * 所以我们把 realisticCustomerPrompt 再包一层语言锁，确保它也遵循语言。
 */
function wrapRealisticPrompt(realistic: string, lang: AppLanguage) {
  return `${languageLock(lang)}\n\n${realistic}`;
}

// ==================== Kimi request ====================

async function kimiRequest(messages: any[], opts?: { systemPrompt?: string }): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      ...(opts?.systemPrompt ? { systemPrompt: opts.systemPrompt } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("后端 /chat 调用失败: ", response.status, text);
    return "";
  }

  let result: any;
  try {
    result = await response.json();
  } catch (e) {
    console.error("后端返回的不是合法 JSON: ", e);
    return "";
  }

  if (result?.error) {
    console.error("Kimi API 返回错误: ", result.error);
    return "";
  }

  const content = result?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error("Kimi 未返回内容: ", result);
    return "";
  }

  return content;
}

// ==================== 1) start session ====================

export async function startSessionWithTrae(config: {
  brand: string;
  persona: string; // personaId
  scenario: string; // scenarioId
  difficulty: string; // difficultyId
  language?: AppLanguage | string;
}) {
  const lang = normalizeLang(config.language);

  const personaPrompt = buildPersonaGenerationPrompt({
    persona: config.persona,
    scenario: config.scenario,
    difficulty: config.difficulty,
    brandKnowledge,
    productLineKnowledge,
    productKnowledge,
  });

  // ✅ 更硬：语言锁 + 原 prompt
  const personaResponse = await kimiRequest([
    { role: "system", content: `${languageLock(lang)}\n\n${personaPrompt}` },
  ]);

  if (!personaResponse) {
    throw new Error(lang === "en" ? "No persona returned from Kimi." : "Kimi 未返回人设，请稍后再试");
  }

  let personaDetails = personaResponse;
  let openingStatement = fallbackOpening(lang);

  const parsed = tryParsePersonaJson(personaResponse);
  personaDetails = parsed.personaDetails;

  if (parsed.openingStatement) {
    // ✅ 双保险：英文模式 openingStatement 出现中文就替换
    if (lang === "en" && containsChinese(parsed.openingStatement)) {
      openingStatement = fallbackOpening(lang);
    } else {
      openingStatement = parsed.openingStatement;
    }
  }

  const dialoguePromptRaw = buildDialoguePrompt({
    personaDetails,
    scenario: config.scenario,
    difficulty: config.difficulty,
    brandKnowledge,
    productLineKnowledge,
    productKnowledge,
  });

  // ✅ 对话系统 prompt：语言锁 + 原 prompt
  const dialoguePrompt = `${languageLock(lang)}\n\n${dialoguePromptRaw}`;

  return {
    sessionId: "kimi_session_" + Date.now(),
    firstMessage: openingStatement,
    personaDetails,
    dialoguePrompt,
  };
}

// ==================== 2) send message ====================

export async function sendMessageToTrae(payload: {
  sessionId: string;
  userMessage: string;
  dialoguePrompt?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  language?: AppLanguage | string;
}) {
  const lang = normalizeLang(payload.language);

  // ✅ 双保险：英文模式用户发中文，直接让顾客提醒（避免模型带偏）
  if (lang === "en" && containsChinese(payload.userMessage)) {
    return {
      reply: "Please speak English.",
      state: "NORMAL" as const,
    };
  }

  const messages: any[] = [];

  // 系统 prompt
  if (payload.dialoguePrompt) {
    // 确保 dialoguePrompt 自带 languageLock（startSession 已加）
    messages.push({ role: "system", content: payload.dialoguePrompt });
  } else {
    messages.push({ role: "system", content: `${languageLock(lang)}\n\n${dialogueSystemPrompt}` });
  }

  // 历史
  if (payload.conversationHistory?.length) {
    messages.push(...payload.conversationHistory);
  }

  // 当前用户消息
  messages.push({ role: "user", content: payload.userMessage });

  // ✅ systemPrompt 也包语言锁，防止它里面有中文导致覆盖
  const reply = await kimiRequest(messages, {
    systemPrompt: wrapRealisticPrompt(realisticCustomerPrompt, lang),
  });

  if (!reply || reply.trim() === "") {
    console.error("Kimi 没有返回内容，使用兜底顾客回复");
    return {
      reply: fallbackCustomerReply(lang),
      state: "NORMAL" as const,
    };
  }

  // ✅ 英文模式：如果模型还是吐了中文，强制替换（最后一道保险）
  if (lang === "en" && containsChinese(reply)) {
    return {
      reply: "Please speak English.",
      state: "NORMAL" as const,
    };
  }

  // state tags
  let state: "NORMAL" | "PURCHASED" | "LEFT" = "NORMAL";
  let cleanReply = reply;

  if (reply.includes("[PURCHASE]")) {
    state = "PURCHASED";
    cleanReply = reply.replace("[PURCHASE]", "").trim();
  } else if (reply.includes("[LEAVE]")) {
    state = "LEFT";
    cleanReply = reply.replace("[LEAVE]", "").trim();
  } else if (reply.includes("[CONTINUE]")) {
    cleanReply = reply.replace("[CONTINUE]", "").trim();
  }

  return { reply: cleanReply, state };
}

// ==================== 3) evaluate ====================

export async function evaluateSessionWithTrae(payload: {
  sessionId: string;
  messages: Array<{ role: string; text: string }>;
  language?: AppLanguage | string;
}) {
  const lang = normalizeLang(payload.language);

  const transcript = payload.messages
    .map((m) => {
      const speaker =
        lang === "en"
          ? m.role === "user"
            ? "Sales"
            : "Customer"
          : m.role === "user"
          ? "销售"
          : "顾客";
      return `${speaker}: ${m.text}`;
    })
    .join("\n");

  const scoreText = await kimiRequest([
    { role: "system", content: `${jsonLock(lang)}\n\n${scoringSystemPrompt}` },
    { role: "user", content: buildScoringPrompt(transcript) },
  ]);

  try {
    return JSON.parse(scoreText) as EvaluationResult;
  } catch {
    return {
      overallScore: 70,
      dimensions: {
        needsDiscovery: 60,
        productKnowledge: 70,
        objectionHandling: 65,
        emotionalConnection: 60,
        closingSkill: 68,
      },
      feedback: scoreText,
    } as EvaluationResult;
  }
}
