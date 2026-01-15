import { useTranslation } from "@/contexts/TranslationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

const LanguageSwitcher = ({ className = "" }) => {
  const { language, changeLanguage, availableLanguages } = useTranslation();

  if (availableLanguages.length <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="language-switcher">
      <Globe size={16} className="text-slate-400" />
      <Select value={language} onValueChange={changeLanguage}>
        <SelectTrigger className="w-28 h-8 text-xs" data-testid="language-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableLanguages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
