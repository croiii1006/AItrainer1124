// backend/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const KIMI_API_KEY = process.env.KIMI_API_KEY;
if (!KIMI_API_KEY) {
  throw new Error("❌ KIMI_API_KEY 没有在 backend/.env 里配置！");
}

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages 必须是数组" });
    }

    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-128k",
        messages,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Kimi API 调用失败: ", response.status, text);
      return res.status(500).json({ error: "Kimi 调用失败", detail: text });
    }

    const result = await response.json();
    res.json(result);

  } catch (err) {
    console.error("后端 /chat 出错: ", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`后端已启动：http://0.0.0.0:${PORT}`);
  });
