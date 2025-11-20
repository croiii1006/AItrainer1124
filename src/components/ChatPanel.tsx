import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, RotateCcw, Send, Video, VideoOff } from "lucide-react";
import type { ChatMessage } from "@/lib/traeClient";
import { useToast } from "@/hooks/use-toast";
import { AudioRecorder, transcribeAudio } from "@/utils/audioRecorder";

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
  // TODO: 接入后端/大模型 - 预留录制相关回调
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const { toast } = useToast();
  const [input, setInput] = useState("");
  
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // TODO: 接入后端/大模型 - 请求摄像头与麦克风权限
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraEnabled(stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled);
      setMicEnabled(stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled);
      setPermissionStatus('granted');
      
      toast({
        title: "摄像头已开启",
        description: "视频和音频权限已授予",
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setPermissionStatus('denied');
      
      toast({
        title: "权限被拒绝",
        description: "无法访问摄像头或麦克风，请检查浏览器权限设置",
        variant: "destructive",
      });
    }
  };

  // TODO: 接入后端/大模型 - 停止摄像头预览
  const stopWebcamPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraEnabled(false);
    setMicEnabled(false);
    setPermissionStatus('pending');
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
    if (isActive && permissionStatus === 'pending') {
      requestMediaPermissions();
    }
    
    return () => {
      if (!isActive) {
        stopWebcamPreview();
      }
    };
  }, [isActive]);

  // 组件卸载时停止摄像头
  useEffect(() => {
    return () => {
      stopWebcamPreview();
    };
  }, []);

  // 会话状态：灰色=未开始，绿色=进行中，蓝色=已结束
  const getSessionStatus = () => {
    if (!isActive && messages.length === 0) return { color: "bg-muted", text: "未开始" };
    if (isActive) return { color: "bg-green-500", text: "进行中" };
    return { color: "bg-blue-500", text: "已结束" };
  };

  const sessionStatus = getSessionStatus();

  return (
    <Card className="h-full bg-card border-border shadow-card flex flex-col">
      {/* 1. 顶部状态栏 */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="border-primary/50 text-foreground">
              {persona || "未选择"}
            </Badge>
            <Badge variant="outline" className="border-accent/50 text-foreground">
              {scenario || "未选择"}
            </Badge>
            <Badge variant="secondary" className="text-foreground">
              {difficulty || "未选择"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              第 {currentRound} / {totalRounds} 轮
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${sessionStatus.color}`} />
              <span className="text-xs text-muted-foreground">{sessionStatus.text}</span>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* 1.5 视频区域（新增） */}
        {isActive && (
          <div className="p-4 border-b border-border">
            <div className="relative w-full h-56 bg-secondary/50 rounded-lg overflow-hidden">
              {/* 销售摄像头窗口（大）- 70% 宽度 */}
              <div className="absolute right-0 top-0 w-[70%] h-full bg-black/80 flex flex-col items-center justify-center">
                {permissionStatus === 'denied' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 bg-black/60 z-10">
                    <VideoOff className="h-12 w-12 mb-2" />
                    <p className="text-sm">摄像头权限未授予</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 text-white border-white/30"
                      onClick={requestMediaPermissions}
                    >
                      重新请求权限
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
                    摄像头：{cameraEnabled ? '已开启' : '已关闭'} | 麦克风：{micEnabled ? '已开启' : '已关闭'}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={toggleCamera}
                      className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                      title={cameraEnabled ? "关闭摄像头" : "开启摄像头"}
                    >
                      {cameraEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                    </button>
                    <button 
                      onClick={toggleMic}
                      className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                      title={micEnabled ? "静音" : "取消静音"}
                    >
                      {micEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* 顾客窗口（小）- 30% 宽度，左上角 */}
              <div className="absolute left-4 top-4 w-[28%] h-32 bg-muted border-2 border-border rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted">
                  <div className="text-3xl mb-2">👤</div>
                  <span className="text-xs text-muted-foreground">AI 顾客场景</span>
                  <span className="text-xs text-muted-foreground">(占位)</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              当前版本只展示销售实时视频和顾客静态场景，后续将接入 AI 视频 Avatar 与表情/注意力分析。
            </p>
          </div>
        )}
        {/* 2. 中部对话区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isActive && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-2 max-w-md">
                <p className="text-muted-foreground text-sm">
                  请在左侧完成训练配置后，点击『开始训练』以生成 AI 顾客并开启模拟对话。
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* 头像 */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    msg.role === "user" 
                      ? "bg-gradient-gold text-luxury-black" 
                      : "bg-primary/20 text-primary"
                  }`}>
                    {msg.role === "user" ? "S" : "C"}
                  </div>
                  
                  {/* 气泡内容 */}
                  <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-xs text-muted-foreground mb-1">
                      {msg.role === "user" ? "销售 Sales" : "AI 顾客 Customer"}
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
                          msg.role === "user"
                            ? "text-luxury-black/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : ""}
                      </p>
                    </div>
                    {/* 语音播放占位 */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Mic className="h-3 w-3" />
                      <span>语音占位</span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>


        {/* 3. 底部控制区 */}
        {isActive && (
          <div className="border-t border-border p-4 space-y-3">
            {/* 辅助说明 */}
            <p className="text-xs text-muted-foreground text-center">
              说明：当前只做前端演示，实际录制与多模态分析将在接入后端与大模型时实现。
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
                  {isRecording ? "录音中…" : "未开始录音"}
                </span>
              </div>
              <span className="text-sm font-mono text-muted-foreground">
                {recordingTime}
              </span>
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
                重新录制
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSendRoundForAnalysis}
                disabled={isLoading || isRecording}
                className="border-border"
              >
                <Send className="mr-2 h-4 w-4" />
                发送本轮分析
              </Button>
              <Button
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={isLoading}
                className="bg-gradient-gold hover:bg-gradient-gold-hover text-luxury-black"
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4" />
                    结束录音
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    开始录音
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
