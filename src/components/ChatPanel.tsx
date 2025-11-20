import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, RotateCcw, Send } from "lucide-react";
import type { ChatMessage } from "@/lib/traeClient";

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
            <Badge variant="outline" className="border-primary/50 text-primary">
              {persona || "未选择"}
            </Badge>
            <Badge variant="outline" className="border-accent/50 text-accent-foreground">
              {scenario || "未选择"}
            </Badge>
            <Badge variant="secondary">
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

        {/* 未来增强功能占位 */}
        {isActive && (
          <div className="mx-6 mb-4 p-3 bg-secondary/50 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>未来增强功能占位：</strong>这里预留视频预览、波形图、实时情绪曲线等组件容器，暂不实现。
            </p>
          </div>
        )}

        {/* 3. 底部控制区 */}
        {isActive && (
          <div className="border-t border-border p-4 space-y-3">
            {/* 辅助说明 */}
            <p className="text-xs text-muted-foreground text-center">
              当前 MVP 以语音回答为主，后续将增加视频表情分析。
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
