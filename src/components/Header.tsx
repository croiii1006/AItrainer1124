import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const Header = () => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-luxury-black border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-gold flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-luxury-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                {t("header.title")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("header.subtitle")}
              </p>
            </div>
          </div>

          {/* Right: Badge */}
          <div className="text-sm text-muted-foreground border border-border px-4 py-2 rounded-lg">
            {t("header.badge")}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
