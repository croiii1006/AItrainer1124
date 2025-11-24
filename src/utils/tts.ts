// src/utils/tts.ts

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * 使用浏览器内置的 SpeechSynthesis 朗读文本
 */
export function speakText(text: string) {
  if (!text || typeof window === "undefined") return;

  // 如果正在播，先停掉
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN"; // 中文
  utterance.rate = 1;       // 语速
  utterance.pitch = 1;      // 音调

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/**
 * 手动停止播放（如果以后需要“停止”按钮可以用）
 */
export function stopSpeak() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}
