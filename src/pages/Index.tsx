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

const Index = () => {
  const { toast } = useToast();

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
        setRecordingTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
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
        title: "开始录音",
        description: "正在录制您的语音...",
      });
      
      console.log("开始录音");
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "录音失败",
        description: error instanceof Error ? error.message : "无法启动录音",
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
        title: "识别中",
        description: "正在将语音转换为文字...",
      });
      
      const base64Audio = await trainingRecorderRef.current.stop();
      const text = await transcribeAudio(base64Audio);
      
      console.log("停止录音，识别结果:", text);
      
      if (text) {
        // 将识别结果作为用户消息添加到对话
        await handleSendMessage(text);
        
        toast({
          title: "识别成功",
          description: `已将您的语音转为文字并发送`,
        });
      } else {
        toast({
          title: "未识别到语音",
          description: "请重试",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: "识别失败",
        description: error instanceof Error ? error.message : "无法识别语音",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRedoRecording = () => {
    setRecordingTime("00:00");
    // TODO: 实现重新录制逻辑
    console.log("重新录制");
  };

  const handleSendRoundForAnalysis = () => {
    // TODO: 实现发送到后端分析逻辑
    console.log("发送本轮到后端分析");
    setCurrentRound((prev) => Math.min(prev + 1, totalRounds));
  };

  const handleStartSession = async () => {
    if (!brand || !persona || !scenario || !difficulty) {
      toast({
        title: "配置不完整",
        description: "请先完成所有配置项",
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
      });

      setSessionId(response.sessionId);
      // 保存配置，用于后续评分
      setSessionConfig({
        brand: brand || "Gucci",
        personaId: PERSONA_MAP[persona],
        scenarioId: SCENARIO_MAP[scenario],
        difficulty: DIFFICULTY_MAP[difficulty],
      });

      // 保存人设和对话 prompt
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
        title: "训练开始",
        description: "AI 顾客已准备好，请开始对话",
      });
    } catch (error) {
      toast({
        title: "启动失败",
        description: "无法启动训练会话，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!sessionId) return;

    const userMsg: ChatMessage = {
      role: "user",
      text: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 构建对话历史（不包含当前用户消息）
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      }));

      const response = await sendMessageToTrae({
        sessionId,
        userMessage,
        dialoguePrompt, // 传入包含人设的对话 prompt
        conversationHistory, // 传入对话历史
      });

      const customerMsg: ChatMessage = {
        role: "customer",
        text: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, customerMsg]);

      // 检查对话是否结束
      if (response.state === "PURCHASED" || response.state === "LEFT") {
        setIsLoading(false);
        // 自动结束会话并评分
        setTimeout(() => {
          handleEndSession();
        }, 1000);
        return;
      }
    } catch (error) {
      toast({
        title: "发送失败",
        description: "消息发送失败，请重试",
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
      });

      setEvaluationResult(result);
      setIsSessionActive(false);

      toast({
        title: "评分完成",
        description: `您的综合得分为 ${result.overallScore} 分`,
      });
    } catch (error) {
      toast({
        title: "评分失败",
        description: "无法生成评分，请稍后重试",
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
      title: "已重置",
      description: "所有配置已清空",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 pt-24 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
          {/* Left Panel - Config */}
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

          {/* Center Panel - Chat */}
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

          {/* Right Panel - Results */}
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
