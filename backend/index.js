// backend/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ extended: true, limit: "50mb" }));


const KIMI_API_KEY = process.env.KIMI_API_KEY;
if (!KIMI_API_KEY) {
  throw new Error("❌ KIMI_API_KEY 没有在 backend/.env 里配置！");
}

// Node 18+ 有全局 fetch；如果你 Node < 18，请安装 node-fetch 并取消下面注释：
// const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

function normalizeLang(lang) {
  return String(lang || "").toLowerCase().startsWith("en") ? "en" : "zh";
}

/**
 * ✅ Kimi Chat (Moonshot)
 * - 统一入口：POST /api/chat
 * - 兼容旧：POST /chat
 * - 支持 systemPrompt：如果传了，就 prepend 到 messages 前面
 */
async function handleKimiChat(req, res) {
  try {
    const { messages, systemPrompt, temperature } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages 必须是数组" });
    }

    const finalMessages = [...messages];

    // ✅ 你前端 traeClient 会传 systemPrompt（比如 realisticCustomerPrompt）
    //    这里把它作为系统消息插到最前面，确保生效
    if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
      finalMessages.unshift({ role: "system", content: systemPrompt.trim() });
    }

    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-128k",
        messages: finalMessages,
        temperature: typeof temperature === "number" ? temperature : 0.8,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Kimi API 调用失败: ", response.status, text);
      return res.status(500).json({ error: "Kimi 调用失败", detail: text });
    }

    const result = await response.json();
    return res.json(result);
  } catch (err) {
    console.error("后端 chat 出错: ", err);
    return res.status(500).json({ error: "服务器内部错误" });
  }
}

// ✅ 新入口：和你前端一致
app.post("/api/chat", handleKimiChat);
// ✅ 兼容旧入口
app.post("/chat", handleKimiChat);

/**
 * ✅ ASR 代理：POST /api/transcribe
 * - 转发到你的 Python/Whisper 服务：http://127.0.0.1:8000/api/transcribe
 * - 强制 language 只能 en / zh（不允许 auto）
 *
 * 前端以后建议改成打 /api/transcribe，而不是直接打 8000（便于统一管理和上云）
 */
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, language } = req.body;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "audioBase64 必须是字符串" });
    }

    const lang = normalizeLang(language); // ✅ 强制 en/zh

    const resp = await fetch("http://127.0.0.1:8000/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64,
        language: lang,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Whisper(8000) 转发失败:", resp.status, text);
      return res.status(500).json({ error: "ASR 转发失败", detail: text });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    console.error("后端 /api/transcribe 出错:", err);
    return res.status(500).json({ error: "服务器内部错误" });
  }
});

const PORT = 3001;
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, from: "MY_BACKEND_3001", time: Date.now() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ 后端已启动：http://0.0.0.0:${PORT}`);
});
