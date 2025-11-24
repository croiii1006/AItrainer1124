export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    // 每次开始录音前，强制清空旧数据（最重要的一行）
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
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stop(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder not initialized"));
        return;
      }

      // 🔥 stop 前先保存局部变量，防止 race condition
      const chunks = this.audioChunks;

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });

          // 🚨 关键：stop 后清空，避免下一次录音叠加旧数据
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

export async function transcribeAudio(base64Audio: string): Promise<string> {
  try {
    const pureBase64 = base64Audio.includes(",")
      ? base64Audio.split(",")[1]
      : base64Audio;

    const response = await fetch("http://127.0.0.1:8000/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audioBase64: pureBase64,
      }),
    });

    if (!response.ok) {
      console.error(
        "Whisper API 调用失败",
        response.status,
        await response.text()
      );
      throw new Error("Whisper API 调用失败");
    }

    const data = await response.json();
    return data.text ?? "";
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
}
