import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, FileText } from "lucide-react";
import type { EvaluationResult } from "@/lib/traeClient";

interface ResultPanelProps {
  persona: string;
  scenario: string;
  difficulty: string;
  evaluationResult: EvaluationResult | null;
  isActive: boolean;
}

const ResultPanel = ({
  persona,
  scenario,
  difficulty,
  evaluationResult,
  isActive,
}: ResultPanelProps) => {
  const [activeTab, setActiveTab] = useState("realtime");

  const dimensionLabels = {
    needsDiscovery: "需求挖掘",
    productKnowledge: "产品知识",
    objectionHandling: "异议处理",
    emotionalConnection: "情绪沟通",
    closingSkill: "成交引导",
  };

  // 会话状态
  const getSessionStatusBadge = () => {
    if (!isActive && !evaluationResult) {
      return <Badge variant="secondary">未开始</Badge>;
    }
    if (isActive) {
      return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">进行中</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">已完成</Badge>;
  };

  // 实时提示数据（占位）
  const realtimeTips = [
    { title: "语速控制", suggestion: "可以稍微放慢语速，让客户更易理解。" },
    { title: "语气礼貌度", suggestion: "保持友好热情的语气，增强客户信任感。" },
    { title: "结构清晰度", suggestion: "建议分点阐述产品优势，结构更清晰。" },
  ];

  // 评分维度数据（占位假数据）
  const mockScoreDimensions = {
    contentExpression: { label: "内容表达", score: 4.2, max: 5 },
    tonePolite: { label: "语气礼貌", score: 3.8, max: 5 },
    emotionStable: { label: "情绪稳定", score: 4.5, max: 5 },
    customerFocus: { label: "客户关注度", score: 4.0, max: 5 },
    professionalImage: { label: "专业形象", score: 4.3, max: 5 },
  };

  return (
    <Card className="h-full bg-card border-border shadow-card flex flex-col">
      {/* 顶部会话概览 */}
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">会话信息</CardTitle>
          {getSessionStatusBadge()}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          开始训练后，这里会显示多维度会话分析结果。
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="realtime" className="text-xs">
              实时提示
            </TabsTrigger>
            <TabsTrigger value="score" className="text-xs">
              评分结果
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">
              会话摘要
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: 实时提示 */}
          <TabsContent value="realtime" className="flex-1 space-y-4">
            <div className="space-y-3">
              {realtimeTips.map((tip, index) => (
                <div
                  key={index}
                  className="p-3 bg-secondary/50 border border-border rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {tip.title}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tip.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 未来功能占位 */}
            <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                未来：实时情绪/语气监测
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                此处预留接入多模态模型（语音情绪/表情）后的实时提示组件。
              </p>
            </div>
          </TabsContent>

          {/* Tab 2: 评分结果 */}
          <TabsContent value="score" className="flex-1 space-y-6">
            {evaluationResult ? (
              <>
                {/* 真实评分 */}
                <div className="text-center space-y-2">
                  <div className="text-6xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                    {evaluationResult.overallScore}
                  </div>
                  <p className="text-sm text-muted-foreground">本次会话综合评分</p>
                </div>

                {/* 维度评分 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">维度评分</h4>
                  {Object.entries(evaluationResult.dimensions).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {dimensionLabels[key as keyof typeof dimensionLabels]}
                        </span>
                        <span className="text-primary font-semibold">{value}</span>
                      </div>
                      <Progress
                        value={value}
                        className="h-2 bg-secondary"
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* 占位评分界面 */}
                <div className="text-center space-y-2">
                  <div className="text-6xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                    82
                  </div>
                  <p className="text-sm text-muted-foreground">本次会话综合评分（占位）</p>
                </div>

                {/* 维度评分条（占位） */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">维度评分（示例数据）</h4>
                  {Object.entries(mockScoreDimensions).map(([key, dim]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{dim.label}</span>
                        <span className="text-primary font-semibold">
                          {dim.score} / {dim.max}
                        </span>
                      </div>
                      <Progress
                        value={(dim.score / dim.max) * 100}
                        className="h-2 bg-secondary"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 雷达图占位 */}
            <div className="p-4 bg-secondary/30 border border-dashed border-border rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                <strong>评分雷达图占位</strong>
                <br />
                <code className="text-[10px]">id = 'scoreRadarPlaceholder'</code>
                <br />
                后续接入图表库使用
              </p>
            </div>
          </TabsContent>

          {/* Tab 3: 会话摘要 */}
          <TabsContent value="summary" className="flex-1 space-y-6">
            {evaluationResult ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">改进建议</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {evaluationResult.feedback}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    AI 分析后将生成本次模拟的整体评价、关键优点和需要改进的点。
                  </p>
                </div>

                {/* 整体评价 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    整体评价
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    本次销售模拟中，您展现了良好的专业素养和沟通技巧。对产品的理解较为深入，能够准确把握客户需求并给出针对性建议。
                  </p>
                </div>

                {/* 优点亮点 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">优点亮点</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>语言表达清晰流畅，逻辑性强</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>善于倾听客户需求，能及时捕捉关键信息</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>产品介绍专业到位，突出了核心卖点</span>
                    </li>
                  </ul>
                </div>

                {/* 改进建议 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">改进建议</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>可以增加更多情感共鸣，建立更深层次的客户联系</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>对客户异议的处理可以更加灵活，提供多角度解决方案</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>建议在适当时机更主动地引导成交，把握销售节奏</span>
                    </li>
                  </ul>
                </div>
              </>
            )}

            {/* 导出报告按钮占位 */}
            <div className="pt-4">
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                导出报告（占位）
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ResultPanel;
