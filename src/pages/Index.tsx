import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import ConfigPanel from "@/components/ConfigPanel";
import ChatPanel from "@/components/ChatPanel";
import ResultPanel from "@/components/ResultPanel";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder, transcribeAudio } from "@/utils/audioRecorder";
import {
  startSessionWithTrae,
  sendMessageToTrae,
  evaluateSessionWithTrae,
  type ChatMessage,
  type EvaluationResult,
  type SessionConfig,
  PERSONA_MAP,
  SCENARIO_MAP,
  DIFFICULTY_MAP,
} from "@/lib/traeClient";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

function LangToggle() {
  const isEn = i18n.language?.startsWith("en");
  return (
    <button
      className="px-3 py-1 rounded-md border text-sm hover:bg-muted"
      onClick={() => {
        const next = isEn ? "zh" : "en";
        i18n.changeLanguage(next);
        localStorage.setItem("lang", next);
      }}
    >
      {isEn ? "中文" : "EN"}
    </button>
  );
}

const Index = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const appLang: "en" | "zh" = i18n.language?.startsWith("en") ? "en" : "zh";


  // ✅ 当前语言（用于 LLM 和 ASR）
  const asrlang: "zh" | "en" = i18n.language?.startsWith("en") ? "en" : "zh";
  const isEn = asrlang === "en";

  // Configuration state
  const [brand, setBrand] = useState("");
  const [persona, setPersona] = useState("");
  const [scenario, setScenario] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const [isLoading, setIsLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  // 保存人设和对话 prompt
  const [personaDetails, setPersonaDetails] = useState<string>("");
  const [dialoguePrompt, setDialoguePrompt] = useState<string>("");

  // 录音器引用
  const trainingRecorderRef = useRef<AudioRecorder | null>(null);

  // MVP 版本：录音和轮次状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState("00:00");
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const totalRounds = 6;

  // 录音计时器
  useEffect(() => {
    let intervalId: number | undefined;

    if (isRecording && recordingStartTime) {
      intervalId = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setRecordingTime(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRecording, recordingStartTime]);

  // 录音功能 - 实际录制并识别
  const handleStartRecording = async () => {
    try {
      trainingRecorderRef.current = new AudioRecorder();
      await trainingRecorderRef.current.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      setRecordingTime("00:00");

      toast({
        title: t("toast.record.start.title"),
        description: t("toast.record.start.desc"),
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: t("toast.record.startFail.title"),
        description: error instanceof Error ? error.message : t("toast.record.startFail.desc"),
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    try {
      if (!trainingRecorderRef.current) return;

      setIsTranscribing(true);
      setIsRecording(false);
      setRecordingStartTime(null);

      toast({
        title: t("toast.record.transcribing.title"),
        description: t("toast.record.transcribing.desc"),
      });

      const base64Audio = await trainingRecorderRef.current.stop();

      const isEn = i18n.language?.startsWith("en");
      const asrLang: "en" | "zh" = isEn ? "en" : "zh";

      const raw = await transcribeAudio(base64Audio, asrLang);
      const text = (raw ?? "").trim();

      console.log("停止录音，识别结果:", text);

      // 1) 空结果：不发送
      if (!text) {
        toast({
          title: t("toast.record.empty.title"),
          description: t("toast.record.empty.desc"),
          variant: "destructive",
        });
        return;
      }

      // 2) 英文模式：必须是英文（否则不发）
      if (isEn) {
        const hasChinese = /[\u4e00-\u9fff]/.test(text);

        // 允许英文/数字/空格/常见标点（你可按需加）
        const looksEnglish =
          /^[A-Za-z0-9\s.,!?'"():;\-/%&]+$/.test(text);

        if (hasChinese || !looksEnglish) {
          toast({
            title: t("toast.record.englishOnly.title", { defaultValue: "English only" }),
            description: t("toast.record.englishOnly.desc", {
              defaultValue: "Please speak English in English mode.",
            }),
            variant: "destructive",
          });
          return; // 🚫 不发到对话框
        }
      }

      // 3) 发送到对话
      await handleSendMessage(text);

      toast({
        title: t("toast.record.success.title"),
        description: t("toast.record.success.desc"),
      });
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast({
        title: t("toast.record.fail.title"),
        description:
          error instanceof Error ? error.message : t("toast.record.fail.desc"),
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };




  const handleRedoRecording = () => {
    setRecordingTime("00:00");
    console.log("重新录制");
  };

  const handleSendRoundForAnalysis = () => {
    console.log("发送本轮到后端分析");
    setCurrentRound((prev) => Math.min(prev + 1, totalRounds));
  };

  const handleStartSession = async () => {
    if (!brand || !persona || !scenario || !difficulty) {
      toast({
        title: t("toast.session.configMissing.title"),
        description: t("toast.session.configMissing.desc"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await startSessionWithTrae({
        brand: brand || "Gucci",
        persona: PERSONA_MAP[persona],
        scenario: SCENARIO_MAP[scenario],
        difficulty: DIFFICULTY_MAP[difficulty],
        language:i18n.language?.startsWith("en") ? "en" : "zh",
      });

      setSessionId(response.sessionId);
      setSessionConfig({
        brand: brand || "Gucci",
        personaId: PERSONA_MAP[persona],
        scenarioId: SCENARIO_MAP[scenario],
        difficulty: DIFFICULTY_MAP[difficulty],
        language: asrlang, // ✅ 保存在 sessionConfig（后续评分/扩展可用）
      });

      setPersonaDetails(response.personaDetails);
      setDialoguePrompt(response.dialoguePrompt);

      setMessages([
        {
          role: "customer",
          text: response.firstMessage,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsSessionActive(true);
      setEvaluationResult(null);

      toast({
        title: t("toast.session.startOk.title"),
        description: t("toast.session.startOk.desc"),
      });
    } catch (error) {
      console.error(error);
      toast({
        title: t("toast.session.startFail.title"),
        description: t("toast.session.startFail.desc"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!sessionId) return;

    const clean = userMessage?.trim();
    if (!clean) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: clean,
      timestamp: new Date().toISOString(),
    };

    // ✅ 先把用户消息加进 UI（一定会显示）
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // ✅ 用 ref 获取“最新历史”，再把当前 userMsg 拼进去
      const historyForRequest = [...messagesRef.current, userMsg].map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      }));

      const response = await sendMessageToTrae({
        sessionId,
        userMessage,
        dialoguePrompt,
        conversationHistory: historyForRequest,
        language:i18n.language?.startsWith("en") ? "en" : "zh",
      });

      const customerMsg: ChatMessage = {
        role: "customer",
        text: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, customerMsg]);

      if (response.state === "PURCHASED" || response.state === "LEFT") {
        setTimeout(() => handleEndSession(), 1000);
        return;
      }
    } catch (error) {
      console.error(error);
      toast({
        title: t("toast.session.sendFail.title"),
        description: t("toast.session.sendFail.desc"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleEndSession = async () => {
    if (!sessionId || !sessionConfig) return;

    setIsLoading(true);
    try {
      const result = await evaluateSessionWithTrae({
        sessionId,
        messages,
        language: appLang, // ✅ 可选：让评分也知道语言（你的 traeClient.ts 需要接）
      });

      setEvaluationResult(result);
      setIsSessionActive(false);

      toast({
        title: t("toast.session.evalOk.title"),
        description: t("toast.session.evalOk.desc", { score: result.overallScore }),
      });
    } catch (error) {
      console.error(error);
      toast({
        title: t("toast.session.evalFail.title"),
        description: t("toast.session.evalFail.desc"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setBrand("");
    setPersona("");
    setScenario("");
    setDifficulty("");
    setSessionId(null);
    setSessionConfig(null);
    setIsSessionActive(false);
    setMessages([]);
    setEvaluationResult(null);
    setPersonaDetails("");
    setDialoguePrompt("");
    setIsLoading(false);
    setIsRecording(false);
    setRecordingTime("00:00");
    setCurrentRound(1);

    toast({
      title: t("toast.session.reset.title"),
      description: t("toast.session.reset.desc"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 pt-24 pb-8">
        <div className="flex justify-end mb-4">
          <LangToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          <div className="lg:col-span-3">
            <ConfigPanel
              brand={brand}
              persona={persona}
              scenario={scenario}
              difficulty={difficulty}
              onBrandChange={setBrand}
              onPersonaChange={setPersona}
              onScenarioChange={setScenario}
              onDifficultyChange={setDifficulty}
              onStart={handleStartSession}
              onReset={handleReset}
              disabled={isSessionActive || isLoading}
            />
          </div>

          <div className="lg:col-span-6">
            <ChatPanel
              persona={persona}
              scenario={scenario}
              difficulty={difficulty}
              messages={messages}
              isActive={isSessionActive}
              isLoading={isLoading}
              currentRound={currentRound}
              totalRounds={totalRounds}
              isRecording={isRecording}
              recordingTime={recordingTime}
              onSendMessage={handleSendMessage}
              onEndSession={handleEndSession}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onRedoRecording={handleRedoRecording}
              onSendRoundForAnalysis={handleSendRoundForAnalysis}
            />
          </div>

          <div className="lg:col-span-3">
            <ResultPanel
              persona={persona}
              scenario={scenario}
              difficulty={difficulty}
              evaluationResult={evaluationResult}
              isActive={isSessionActive}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
