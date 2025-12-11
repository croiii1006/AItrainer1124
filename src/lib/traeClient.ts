// ==================== 导入 ====================
import { buildPersonaGenerationPrompt, buildDialoguePrompt, dialogueSystemPrompt } from "./prompts/persona-and-dialogue";
import { scoringSystemPrompt, buildScoringPrompt } from "./prompts/scoring-criteria";
import { brandKnowledge } from "./knowledge/brand";
import { productLineKnowledge } from "./knowledge/product-line";
import { productKnowledge } from "./knowledge/product";

// ==================== 类型定义 ====================

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

export interface SessionConfig {
  personaId: string;
  scenarioId: string;
  difficulty: string;
  brand?: string;
  productLine?: string;
  knowledgeBaseIds?: string[];
  scoringModelId?: string;
  language?: string;
}

// ==================== 映射表 ====================

export const PERSONA_MAP: Record<string, string> = {
  "高净值顾客": "HNWI",
  "旅游客": "TOURIST",
  "犹豫型顾客": "HESITANT",
  "礼物购买者": "GIFT",
  "价格敏感型顾客": "PRICE_SENSITIVE",
};

export const SCENARIO_MAP: Record<string, string> = {
  "首次进店": "FIRST_VISIT",
  "VIP 回访": "VIP_RETURN",
  "购买送老板的礼物": "GIFT_FOR_BOSS",
  "机场免税店场景": "DUTY_FREE",
  "线上咨询": "ONLINE_CONSULT",
};

export const DIFFICULTY_MAP: Record<string, string> = {
  "基础": "BASIC",
  "中级": "INTERMEDIATE",
  "高级": "ADVANCED",
};

import { realisticCustomerPrompt } from "./prompts/customerRealistic";

// ==================== Kimi API ====================

async function kimiRequest(messages: any[]) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // 👇 关键修改：把 systemPrompt 一起带过去
    body: JSON.stringify({
      messages,
      systemPrompt: realisticCustomerPrompt,
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

  if (result.error) {
    console.error("Kimi API 返回错误: ", result.error);
    return "";
  }

  const content = result.choices?.[0]?.message?.content?.trim();
  if (!content) {
    console.error("Kimi 未返回内容: ", result);
    return "";
  }

  return content;
}



// -------------------------------
// 1. 启动 Session（两阶段：先生成人设，再开始对话）
// -------------------------------
export async function startSessionWithTrae(config: {
  brand: string;
  persona: string;
  scenario: string;
  difficulty: string;
}) {
  // 第一步：生成人设
  const personaPrompt = buildPersonaGenerationPrompt({
    persona: config.persona,
    scenario: config.scenario,
    difficulty: config.difficulty,
    brandKnowledge,
    productLineKnowledge,
    productKnowledge,
  });

  const personaResponse = await kimiRequest([
    { role: "system", content: personaPrompt },
  ]);
  
  if (!personaResponse) {
    // 这里直接抛错，让外层用 toast 提示“启动失败”
    throw new Error("Kimi 未返回人设，请稍后再试");
  }
  
  // 解析人设 JSON
  let personaDetails = personaResponse;
  let openingStatement = "你好，我想看看产品。";
  
  try {
    // 先把 ```json ``` 这种代码块包裹去掉
    let cleaned = personaResponse.trim();
  
    if (cleaned.startsWith("```")) {
      // 去掉开头的 ```json / ``` 之类
      cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "");
      // 去掉最后结尾的 ```
      cleaned = cleaned.replace(/```$/, "").trim();
    }
  
    const personaJson = JSON.parse(cleaned);
  
    openingStatement = personaJson.openingStatement || openingStatement;
    personaDetails = JSON.stringify(personaJson, null, 2);
  } catch (e) {
    console.warn("人设解析失败，使用原始文本", e);
  }
  

  // 第二步：基于人设生成对话系统 prompt
  const dialoguePrompt = buildDialoguePrompt({
    personaDetails,
    scenario: config.scenario,
    difficulty: config.difficulty,
    brandKnowledge,
    productLineKnowledge,
    productKnowledge,
  });

  return {
    sessionId: "kimi_session_" + Date.now(),
    firstMessage: openingStatement,
    personaDetails, // 保存人设供后续使用
    dialoguePrompt, // 保存对话 prompt
  };
}

// -------------------------------
// 2. 对话：发送消息（需要传入人设信息）
// -------------------------------
export async function sendMessageToTrae(payload: {
  sessionId: string;
  userMessage: string;
  dialoguePrompt?: string; // 包含人设的对话 prompt
  conversationHistory?: Array<{ role: string; content: string }>; // 对话历史
}) {
  // 构建消息历史
  const messages = [];
  
  if (payload.dialoguePrompt) {
    messages.push({ role: "system", content: payload.dialoguePrompt });
  } else {
    messages.push({ role: "system", content: dialogueSystemPrompt });
  }

  // 添加对话历史
  if (payload.conversationHistory && payload.conversationHistory.length > 0) {
    messages.push(...payload.conversationHistory);
  }

  // 添加当前用户消息
  messages.push({ role: "user", content: payload.userMessage });

  const reply = await kimiRequest(messages);

  if (!reply || reply.trim() === "") {
    console.error("Kimi 没有返回内容，使用兜底顾客回复");
    return {
      reply: "抱歉，我这边有点忙，刚刚没有听清楚，您可以再说一遍吗？",
      state: "NORMAL",
    };
  }

  // 检测对话状态
  let state = "NORMAL";
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

  return {
    reply: cleanReply,
    state,
  };
}

// -------------------------------
// 3. 评分：让 Kimi 做评估
// -------------------------------
export async function evaluateSessionWithTrae(payload: {
  sessionId: string;
  messages: Array<{ role: string; text: string }>;
}) {
  const transcript = payload.messages
    .map((m) => `${m.role === "user" ? "销售" : "顾客"}：${m.text}`)
    .join("\n");

  const scoreText = await kimiRequest([
    {
      role: "system",
      content: scoringSystemPrompt,
    },
    {
      role: "user",
      content: buildScoringPrompt(transcript),
    },
  ]);

  try {
    return JSON.parse(scoreText);
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
    };
  }
}
