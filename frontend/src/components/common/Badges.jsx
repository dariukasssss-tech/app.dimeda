import { useTranslation } from "@/contexts/TranslationContext";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle, XCircle, Timer, Shield, ShieldOff, Play } from "lucide-react";

/**
 * Issue status badge component
 */
export const StatusBadge = ({ status, className = "" }) => {
  const { t } = useTranslation();
  
  const statusConfig = {
    open: { color: "bg-amber-100 text-amber-800", icon: AlertTriangle, label: t("issues.status.open") },
    in_progress: { color: "bg-blue-100 text-blue-800", icon: Clock, label: t("issues.status.inProgress") },
    in_service: { color: "bg-purple-100 text-purple-800", icon: Timer, label: t("issues.status.inService") },
    resolved: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle, label: t("issues.status.resolved") },
    cancelled: { color: "bg-slate-100 text-slate-800", icon: XCircle, label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

/**
 * Warranty status badge component
 */
export const WarrantyBadge = ({ status, className = "" }) => {
  const { t } = useTranslation();
  
  if (!status) return null;
  
  const isWarranty = status === "warranty";
  const Icon = isWarranty ? Shield : ShieldOff;
  const color = isWarranty ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  const label = isWarranty ? t("services.warranty") : t("services.nonWarranty");

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

/**
 * Severity badge component
 */
export const SeverityBadge = ({ severity, className = "" }) => {
  const severityConfig = {
    critical: "bg-red-500 text-white",
    high: "bg-red-100 text-red-800",
    medium: "bg-amber-100 text-amber-800",
    low: "bg-slate-100 text-slate-800",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityConfig[severity] || severityConfig.medium} ${className}`}>
      {severity}
    </span>
  );
};

/**
 * Issue code badge component
 */
export const IssueCodeBadge = ({ code, className = "" }) => {
  if (!code) return null;
  
  return (
    <span className={`px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono ${className}`}>
      {code}
    </span>
  );
};

/**
 * SLA remaining indicator
 */
export const SLAIndicator = ({ issue, compact = false }) => {
  const { t } = useTranslation();
  
  if (!issue?.created_at) return null;
  
  const createdAt = new Date(issue.created_at);
  const slaDeadline = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = slaDeadline - now;
  
  if (diffMs <= 0) {
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full font-medium bg-red-500 text-white ${compact ? "" : "animate-pulse"}`}>
        {t("time.slaExpired")}
      </span>
    );
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  let urgency = "bg-amber-100 text-amber-800";
  if (hours < 2) urgency = "bg-red-500 text-white";
  else if (hours < 6) urgency = "bg-orange-500 text-white";
  
  const text = hours > 0 
    ? t("time.hoursLeft", { hours, minutes }) 
    : t("time.minutesLeft", { minutes });
  
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${urgency}`}>
      SLA: {text}
    </span>
  );
};

/**
 * Task type badge for calendar/service entries
 */
export const TaskTypeBadge = ({ type, className = "" }) => {
  const typeConfig = {
    scheduled_maintenance: { color: "bg-blue-500", label: "Maintenance" },
    issue_task: { color: "bg-amber-500", label: "Issue" },
    warranty_service: { color: "bg-green-500", label: "Warranty" },
  };
  
  const config = typeConfig[type] || { color: "bg-slate-500", label: type };
  
  return (
    <span className={`px-2 py-0.5 text-xs rounded font-medium text-white ${config.color} ${className}`}>
      {config.label}
    </span>
  );
};

export default {
  StatusBadge,
  WarrantyBadge,
  SeverityBadge,
  IssueCodeBadge,
  SLAIndicator,
  TaskTypeBadge,
};
