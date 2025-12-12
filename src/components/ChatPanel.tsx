import { useRef, useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, RotateCcw, Send, Video, VideoOff } from "lucide-react";
import type { ChatMessage } from "@/lib/traeClient";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/utils/audioRecorder";
import { speakText } from "@/utils/tts";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

interface ChatPanelProps {
  persona: string;
  scenario: string;
  difficulty: string;
  messages: ChatMessage[];
  isActive: boolean;
  isLoading: boolean;
  currentRound: number;
  totalRounds: number;
  isRecording: boolean;
  recordingTime: string;
  onSendMessage: (message: string) => void;
  onEndSession: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onRedoRecording?: () => void;
  onSendRoundForAnalysis?: () => void;
}

const ChatPanel = ({
  persona,
  scenario,
  difficulty,
  messages,
  isActive,
  isLoading,
  currentRound,
  totalRounds,
  isRecording,
  recordingTime,
  onSendMessage,
  onEndSession,
  onStartRecording,
  onStopRecording,
  onRedoRecording,
  onSendRoundForAnalysis,
}: ChatPanelProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const lastSpokenCustomerIndexRef = useRef<number>(-1);

  const [input, setInput] = useState("");

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "pending"
  >("pending");
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const isEn = i18n.language?.startsWith("en");
  const timeLocale = isEn ? "en-US" : "zh-CN";
  const p = (persona || "").trim();
  const s = (scenario || "").trim();
  const d = (difficulty || "").trim();

  // ✅ UI value（中文） -> i18n key 的映射（只影响显示，不影响业务映射表）
  const personaKeyMap: Record<string, string> = {
    "高净值顾客": "hnw",
    "旅游客": "tourist",
    "犹豫型顾客": "hesitant",
    "礼物购买者": "gift",
    "价格敏感型顾客": "priceSensitive",
  };

  const scenarioKeyMap: Record<string, string> = {
    "首次进店": "firstVisit",
    "VIP 回访": "vipReturn",
    "购买送老板的礼物": "giftForBoss",
    "机场免税店场景": "dutyFree",
    "线上咨询": "onlineInquiry",
  };

  const difficultyKeyMap: Record<string, string> = {
    "基础": "basic",
    "中级": "intermediate",
    "高级": "advanced",
  };
  const personaKey = personaKeyMap[p];
  const scenarioKey = scenarioKeyMap[s];
  const difficultyKey = difficultyKeyMap[d];

  // ✅ 英文模式：只要 key 存在就强制走英文；不命中就别回退中文，直接 Not selected
  const personaText = !p
    ? t("common.notSelected")
    : personaKey
      ? t(`config.persona.options.${personaKey}`)
      : (isEn ? t("common.notSelected") : p);

  const scenarioText = !s
    ? t("common.notSelected")
    : scenarioKey
      ? t(`config.scenario.options.${scenarioKey}`)
      : (isEn ? t("common.notSelected") : s);

  const difficultyText = !d
    ? t("common.notSelected")
    : difficultyKey
      ? t(`config.difficulty.options.${difficultyKey}`)
      : (isEn ? t("common.notSelected") : d);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 顾客文字出现时自动播放一次语音
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    let lastIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "customer") {
        lastIndex = i;
        break;
      }
    }
    if (lastIndex === -1) return;
    if (lastIndex <= lastSpokenCustomerIndexRef.current) return;

    const lastCustomerMsg = messages[lastIndex];
    speakText(lastCustomerMsg.text);
    lastSpokenCustomerIndexRef.current = lastIndex;
  }, [messages]);

  // 请求摄像头与麦克风权限
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraEnabled(
        stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled,
      );
      setMicEnabled(
        stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled,
      );
      setPermissionStatus("granted");

      toast({
        title: t("chat.toast.mediaGranted.title"),
        description: t("chat.toast.mediaGranted.desc"),
      });
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setPermissionStatus("denied");

      toast({
        title: t("chat.toast.mediaDenied.title"),
        description: t("chat.toast.mediaDenied.desc"),
        variant: "destructive",
      });
    }
  };

  // 停止摄像头预览
  const stopWebcamPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraEnabled(false);
    setMicEnabled(false);
    setPermissionStatus("pending");
  };

  // 切换摄像头开关
  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  // 切换麦克风开关
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // 当会话开始时请求权限
  useEffect(() => {
    if (isActive && permissionStatus === "pending") {
      requestMediaPermissions();
    }

    return () => {
      if (!isActive) stopWebcamPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // 组件卸载时停止摄像头
  useEffect(() => {
    return () => {
      stopWebcamPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会话状态：灰色=未开始，绿色=进行中，蓝色=已结束
  const getSessionStatus = () => {
    if (!isActive && messages.length === 0)
      return { color: "bg-muted", text: t("chat.sessionStatus.notStarted") };
    if (isActive) return { color: "bg-green-500", text: t("chat.sessionStatus.active") };
    return { color: "bg-blue-500", text: t("chat.sessionStatus.ended") };
  };

  const sessionStatus = getSessionStatus();

  return (
    <Card className="h-full bg-card border-border shadow-card flex flex-col">
      {/* 顶部状态栏 */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-primary/50 text-foreground">
              {personaText}
            </Badge>
            <Badge variant="outline" className="border-accent/50 text-foreground">
              {scenarioText}
            </Badge>
            <Badge variant="secondary" className="text-foreground">
              {difficultyText}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {t("chat.round", { current: currentRound, total: totalRounds })}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sessionStatus.color}`} />
              <span className="text-xs text-muted-foreground">{sessionStatus.text}</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* 视频区域 */}
        {isActive && (
          <div className="p-4 border-b border-border">
            <div className="relative w-full h-56 bg-secondary/50 rounded-lg overflow-hidden">
              {/* 销售摄像头窗口（大） */}
              <div className="absolute right-0 top-0 w-[70%] h-full bg-black/80 flex flex-col items-center justify-center">
                {permissionStatus === "denied" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 bg-black/60 z-10">
                    <VideoOff className="h-12 w-12 mb-2" />
                    <p className="text-sm">{t("chat.video.permissionDenied")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-white border-white/30"
                      onClick={requestMediaPermissions}
                    >
                      {t("chat.video.requestAgain")}
                    </Button>
                  </div>
                )}

                <video
                  ref={videoRef}
                  id="salesWebcam"
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/80 bg-black/40 px-3 py-2 rounded backdrop-blur-sm">
                  <span>
                    {t("chat.video.statusLine", {
                      camera: cameraEnabled ? t("common.on") : t("common.off"),
                      mic: micEnabled ? t("common.on") : t("common.off"),
                    })}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleCamera}
                      className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                      title={
                        cameraEnabled
                          ? t("chat.video.turnOffCamera")
                          : t("chat.video.turnOnCamera")
                      }
                    >
                      {cameraEnabled ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <VideoOff className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={toggleMic}
                      className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                      title={micEnabled ? t("chat.video.mute") : t("chat.video.unmute")}
                    >
                      {micEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 顾客窗口（小） */}
              <div className="absolute left-4 top-4 w-[28%] h-32 bg-muted border-2 border-border rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted">
                  <div className="text-3xl mb-2">👤</div>
                  <span className="text-xs text-muted-foreground">{t("chat.video.customerScene")}</span>
                  <span className="text-xs text-muted-foreground">{t("chat.video.placeholder")}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t("chat.video.note")}
            </p>
          </div>
        )}

        {/* 对话区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isActive && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-2 max-w-md">
                <p className="text-muted-foreground text-sm">{t("chat.emptyHint")}</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* 头像 */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      msg.role === "user"
                        ? "bg-gradient-gold text-luxury-black"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {msg.role === "user" ? "S" : "C"}
                  </div>

                  {/* 气泡内容 */}
                  <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-muted-foreground mb-1">
                      {msg.role === "user" ? t("chat.role.sales") : t("chat.role.customer")}
                    </span>

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-gradient-gold text-luxury-black"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>

                      <p
                        className={`text-xs mt-1 ${
                          msg.role === "user" ? "text-luxury-black/70" : "text-muted-foreground"
                        }`}
                      >
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString(timeLocale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>

                    {/* 语音播放按钮：只给顾客消息显示 */}
                    {msg.role === "customer" && (
                      <button
                        type="button"
                        onClick={() => speakText(msg.text)}
                        className="flex items-center gap-2 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mic className="h-3 w-3" />
                        <span>{t("chat.playCustomerVoice")}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* 底部控制区 */}
        {isActive && (
          <div className="border-t border-border p-4 space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              {t("chat.footer.note")}
            </p>

            {/* 录制状态条 */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                {isRecording ? (
                  <MicOff className="h-5 w-5 text-destructive animate-pulse" />
                ) : (
                  <Mic className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {isRecording ? t("chat.recording.inProgress") : t("chat.recording.notStarted")}
                </span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{recordingTime}</span>
            </div>

            {/* 按钮组 */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onRedoRecording}
                disabled={isLoading}
                className="border-border"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {t("chat.actions.redo")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onSendRoundForAnalysis}
                disabled={isLoading || isRecording}
                className="border-border"
              >
                <Send className="mr-2 h-4 w-4" />
                {t("chat.actions.sendRound")}
              </Button>

              <Button
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={isLoading}
                className="bg-gradient-gold hover:bg-gradient-gold-hover text-luxury-black"
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" />
                    {t("chat.actions.stopRecording")}
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    {t("chat.actions.startRecording")}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatPanel;
