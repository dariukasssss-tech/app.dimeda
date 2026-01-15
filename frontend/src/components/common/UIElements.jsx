import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Loading spinner component
 */
export const LoadingSpinner = ({ size = 24, className = "" }) => {
  return <Loader2 className={`animate-spin ${className}`} size={size} />;
};

/**
 * Full page loading state
 */
export const LoadingState = ({ message }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingSpinner size={32} className="text-[#0066CC] mb-4" />
      <p className="text-slate-500">{message || t("common.loading")}</p>
    </div>
  );
};

/**
 * Empty state component
 */
export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="mx-auto text-slate-300 mb-4" size={48} />}
      <h3 className="text-lg font-medium text-slate-600">{title}</h3>
      {description && <p className="text-slate-400 mt-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

/**
 * Error state component
 */
export const ErrorState = ({ title, message, onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
        <span className="text-red-500 text-2xl">!</span>
      </div>
      <h3 className="text-lg font-medium text-slate-600">{title || t("common.error")}</h3>
      {message && <p className="text-slate-400 mt-2">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3]"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
};

/**
 * Stat card component
 */
export const StatCard = ({ title, value, icon: Icon, color, onClick, testId, loading }) => {
  return (
    <Card 
      className={`card-hover ${onClick ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}`}
      data-testid={testId}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {loading ? "..." : value}
            </p>
          </div>
          {Icon && (
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color || "bg-[#0066CC]"}`}>
              <Icon className="text-white" size={24} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Page header component
 */
export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
};

/**
 * Section card with header
 */
export const SectionCard = ({ title, subtitle, actions, children, testId }) => {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</CardTitle>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default {
  LoadingSpinner,
  LoadingState,
  EmptyState,
  ErrorState,
  StatCard,
  PageHeader,
  SectionCard,
};
