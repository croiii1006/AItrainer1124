import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, FileText } from "lucide-react";
import type { EvaluationResult } from "@/lib/traeClient";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("realtime");

  // 维度 label（用于真实评分 dimensions 的 key 映射）
  const dimensionLabels: Record<string, string> = {
    needsDiscovery: t("result.dimensions.needsDiscovery"),
    productKnowledge: t("result.dimensions.productKnowledge"),
    objectionHandling: t("result.dimensions.objectionHandling"),
    emotionalConnection: t("result.dimensions.emotionalConnection"),
    closingSkill: t("result.dimensions.closingSkill"),
  };

  // 会话状态
  const getSessionStatusBadge = () => {
    if (!isActive && !evaluationResult) {
      return <Badge variant="secondary">{t("result.status.notStarted")}</Badge>;
    }
    if (isActive) {
      return (
        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
          {t("result.status.inProgress")}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">
        {t("result.status.completed")}
      </Badge>
    );
  };

  // 实时提示数据（占位）
  const realtimeTips = [
    { title: t("result.realtimeTips.speed.title"), suggestion: t("result.realtimeTips.speed.suggestion") },
    { title: t("result.realtimeTips.politeness.title"), suggestion: t("result.realtimeTips.politeness.suggestion") },
    { title: t("result.realtimeTips.structure.title"), suggestion: t("result.realtimeTips.structure.suggestion") },
  ];

  // 评分维度数据（占位假数据）
  const mockScoreDimensions = {
    contentExpression: { label: t("result.mockDims.contentExpression"), score: 4.2, max: 5 },
    tonePolite: { label: t("result.mockDims.tonePolite"), score: 3.8, max: 5 },
    emotionStable: { label: t("result.mockDims.emotionStable"), score: 4.5, max: 5 },
    customerFocus: { label: t("result.mockDims.customerFocus"), score: 4.0, max: 5 },
    professionalImage: { label: t("result.mockDims.professionalImage"), score: 4.3, max: 5 },
  };

  return (
    <Card className="h-full bg-card border-border shadow-card flex flex-col">
      {/* 顶部会话概览 */}
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("result.header.title")}
          </CardTitle>
          {getSessionStatusBadge()}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("result.header.subtitle")}
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="realtime" className="text-xs">
              {t("result.tabs.realtime")}
            </TabsTrigger>
            <TabsTrigger value="score" className="text-xs">
              {t("result.tabs.score")}
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">
              {t("result.tabs.summary")}
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
                {t("result.realtimeFuture.title")}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("result.realtimeFuture.desc")}
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
                  <p className="text-sm text-muted-foreground">
                    {t("result.score.realOverallLabel")}
                  </p>
                </div>

                {/* 维度评分 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("result.score.dimensionTitle")}
                  </h4>
                  {Object.entries(evaluationResult.dimensions).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {dimensionLabels[key] ?? key}
                        </span>
                        <span className="text-primary font-semibold">{value}</span>
                      </div>
                      <Progress value={value} className="h-2 bg-secondary" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* 占位评分界面 */}
                <div className="text-center space-y-2">
                  <div className="text-6xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                    {t("result.score.placeholderOverallValue")}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("result.score.placeholderOverallLabel")}
                  </p>
                </div>

                {/* 维度评分条（占位） */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("result.score.placeholderDimTitle")}
                  </h4>
                  {Object.entries(mockScoreDimensions).map(([key, dim]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground">{dim.label}</span>
                        <span className="text-primary font-semibold">
                          {dim.score} / {dim.max}
                        </span>
                      </div>
                      <Progress value={(dim.score / dim.max) * 100} className="h-2 bg-secondary" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 雷达图占位 */}
            <div className="p-4 bg-secondary/30 border border-dashed border-border rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                <strong>{t("result.radar.title")}</strong>
                <br />
                <code className="text-[10px]">{t("result.radar.code")}</code>
                <br />
                {t("result.radar.desc")}
              </p>
            </div>
          </TabsContent>

          {/* Tab 3: 会话摘要 */}
          <TabsContent value="summary" className="flex-1 space-y-6">
            {evaluationResult ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("result.summary.improvementTitle")}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {evaluationResult.feedback}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("result.summary.placeholderIntro")}
                  </p>
                </div>

                {/* 整体评价 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t("result.summary.overallTitle")}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("result.summary.overallText")}
                  </p>
                </div>

                {/* 优点亮点 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("result.summary.strengthsTitle")}
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{t("result.summary.strengths.0")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{t("result.summary.strengths.1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{t("result.summary.strengths.2")}</span>
                    </li>
                  </ul>
                </div>

                {/* 改进建议 */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {t("result.summary.improvementTitle")}
                  </h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{t("result.summary.improvements.0")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{t("result.summary.improvements.1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{t("result.summary.improvements.2")}</span>
                    </li>
                  </ul>
                </div>
              </>
            )}

            {/* 导出报告按钮占位 */}
            <div className="pt-4">
              <Button variant="outline" className="w-full" disabled>
                {t("result.export.placeholder")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ResultPanel;
