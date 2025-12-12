export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.audioChunks.push(event.data);
    };

    this.mediaRecorder.start();
  }

  async stop(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not initialized"));
        return;
      }

      const chunks = this.audioChunks;

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          this.audioChunks = [];

          const base64Audio = await this.blobToBase64(audioBlob);

          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          this.mediaRecorder = null;
          resolve(base64Audio);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }
}

// ✅ 改这里：统一打到 Node(3001) 转发，再由 Node 去打 8000
export async function transcribeAudio(
  base64Audio: string,
  language: "en" | "zh" = "zh",
): Promise<string> {
  const pureBase64 = base64Audio.includes(",") ? base64Audio.split(",")[1] : base64Audio;

  // 这里用 3001（你的 backend/index.js 端口）
  const response = await fetch("http://127.0.0.1:3001/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: pureBase64,
      language, // en/zh
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("ASR 调用失败", response.status, detail);
    throw new Error("ASR 调用失败");
  }

  const data = await response.json();
  return (data?.text ?? "").trim();
}
