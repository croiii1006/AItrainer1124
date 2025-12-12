import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ConfigPanelProps {
  brand: string;
  persona: string;
  scenario: string;
  difficulty: string;
  onBrandChange: (value: string) => void;
  onPersonaChange: (value: string) => void;
  onScenarioChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  onStart: () => void;
  onReset: () => void;
  disabled: boolean;
}

const PERSONA_OPTIONS = [
  { value: "高净值顾客", key: "hnw" },
  { value: "旅游客", key: "tourist" },
  { value: "犹豫型顾客", key: "hesitant" },
  { value: "礼物购买者", key: "gift" },
  { value: "价格敏感型顾客", key: "priceSensitive" },
] as const;

const SCENARIO_OPTIONS = [
  { value: "首次进店", key: "firstVisit" },
  { value: "VIP 回访", key: "vipReturn" },
  { value: "购买送老板的礼物", key: "giftForBoss" },
  { value: "机场免税店场景", key: "dutyFree" },
  { value: "线上咨询", key: "onlineInquiry" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "基础", key: "basic" },
  { value: "中级", key: "intermediate" },
  { value: "高级", key: "advanced" },
] as const;

const BRAND_OPTIONS = [
  { value: "Gucci", label: "Gucci" },
  { value: "Balenciaga", label: "Balenciaga" },
  { value: "Saint Laurent", label: "Saint Laurent" },
  { value: "Bottega Veneta", label: "Bottega Veneta" },
  { value: "LV", label: "LV" },
] as const;

const ConfigPanel = ({
  brand,
  persona,
  scenario,
  difficulty,
  onBrandChange,
  onPersonaChange,
  onScenarioChange,
  onDifficultyChange,
  onStart,
  onReset,
  disabled,
}: ConfigPanelProps) => {
  const { t } = useTranslation();

  return (
    <Card className="h-full bg-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {t("config.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Brand */}
        <div className="space-y-2">
          <Label htmlFor="brand" className="text-sm font-medium">
            {t("config.brand.label")}
          </Label>

          <Select value={brand} onValueChange={onBrandChange} disabled={disabled}>
            <SelectTrigger id="brand" className="bg-secondary border-border">
              <SelectValue placeholder={t("config.brand.placeholder")} />
            </SelectTrigger>

            <SelectContent className="bg-popover border-border">
              {BRAND_OPTIONS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Persona */}
        <div className="space-y-2">
          <Label htmlFor="persona" className="text-sm font-medium">
            {t("config.persona.label")}
          </Label>

          <Select value={persona} onValueChange={onPersonaChange} disabled={disabled}>
            <SelectTrigger id="persona" className="bg-secondary border-border">
              <SelectValue placeholder={t("config.persona.placeholder")} />
            </SelectTrigger>

            <SelectContent className="bg-popover border-border">
              {PERSONA_OPTIONS.map((p) => (
                <SelectItem key={p.key} value={p.value}>
                  {t(`config.persona.options.${p.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Scenario */}
        <div className="space-y-2">
          <Label htmlFor="scenario" className="text-sm font-medium">
            {t("config.scenario.label")}
          </Label>

          <Select value={scenario} onValueChange={onScenarioChange} disabled={disabled}>
            <SelectTrigger id="scenario" className="bg-secondary border-border">
              <SelectValue placeholder={t("config.scenario.placeholder")} />
            </SelectTrigger>

            <SelectContent className="bg-popover border-border">
              {SCENARIO_OPTIONS.map((s) => (
                <SelectItem key={s.key} value={s.value}>
                  {t(`config.scenario.options.${s.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t("config.difficulty.label")}
          </Label>

          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((d) => (
              <Button
                key={d.key}
                variant={difficulty === d.value ? "default" : "outline"}
                size="sm"
                onClick={() => onDifficultyChange(d.value)}
                disabled={disabled}
                className="transition-all"
              >
                {t(`config.difficulty.options.${d.key}`)}
              </Button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-3 border-t border-border">
          <Button
            onClick={onStart}
            disabled={disabled || !brand || !persona || !scenario || !difficulty}
            className="w-full bg-gradient-gold hover:opacity-90 text-luxury-black font-semibold"
          >
            <Play className="w-4 h-4 mr-2" />
            {t("config.actions.start")}
          </Button>

          <Button variant="ghost" onClick={onReset} disabled={disabled} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t("config.actions.reset")}
          </Button>
        </div>

        {/* Footer note */}
        <div className="pt-4 text-xs text-muted-foreground border-t border-border">
          <p>{t("config.footer.note")}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigPanel;
