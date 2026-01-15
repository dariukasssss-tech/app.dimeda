import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import ContactDetailsPopup from "@/components/ContactDetailsPopup";
import { 
  Clock, 
  CheckCircle, 
  Shield, 
  ShieldOff, 
  Timer, 
  User,
  AlertTriangle
} from "lucide-react";

/**
 * Severity color mapping
 */
const severityColors = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

/**
 * Calculate SLA time remaining for customer issues
 * @param {Object} issue - The issue object
 * @param {Function} t - Translation function
 * @param {string} modelType - Product model type ('powered' or 'roll_in')
 * @returns {Object|null} - SLA info or null
 */
const calculateSLARemaining = (issue, t, modelType = 'powered') => {
  if (issue.warranty_service_type === "non_warranty") return null;
  if (issue.source !== "customer" || issue.status === "resolved") return null;
  // Skip SLA for Roll-in stretchers
  if (modelType === "roll_in") return null;
  
  const createdAt = new Date(issue.created_at);
  const slaDeadline = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = slaDeadline - now;
  
  if (diffMs <= 0) {
    return { expired: true, text: t("time.slaExpired") || "SLA Expired", urgent: true };
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return { expired: false, text: `${hours}h ${minutes}m left`, urgent: hours < 2 };
  }
  return { expired: false, text: `${minutes}m left`, urgent: true };
};

/**
 * IssueCard - Reusable card component for displaying issues
 * 
 * @param {Object} props
 * @param {Object} props.issue - The issue data
 * @param {Array} props.products - List of all products
 * @param {Function} props.onResolve - Callback when resolve button is clicked
 * @param {boolean} props.showResolveButton - Whether to show the resolve button
 * @param {boolean} props.showContactDetails - Whether to show contact details button
 * @param {string} props.variant - Card variant: 'default' | 'in-progress' | 'customer'
 */
const IssueCard = ({ 
  issue, 
  products, 
  onResolve,
  showResolveButton = false,
  showContactDetails = true,
  variant = 'default'
}) => {
  const { t } = useTranslation();

  const getProductSerial = (productId) => {
    const product = products?.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const getProductCity = (productId) => {
    const product = products?.find((p) => p.id === productId);
    return product?.city || "Unknown";
  };

  const getProductModelType = (productId) => {
    const product = products?.find((p) => p.id === productId);
    return product?.model_type || "powered";
  };

  const modelType = getProductModelType(issue.product_id);
  const isRollIn = modelType === "roll_in";
  const sla = calculateSLARemaining(issue, t, modelType);
  const isCustomer = issue.source === "customer";

  return (
    <Card 
      className={`card-hover ${isCustomer ? "bg-slate-50 border-slate-300" : ""}`}
      data-testid={`issue-card-${issue.id}`}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            {/* Badges Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {isCustomer && (
                <Badge className="bg-purple-100 text-purple-800">
                  Customer Reported
                </Badge>
              )}
              {/* Roll-in Stretcher badge */}
              {isRollIn && (
                <Badge className="bg-teal-100 text-teal-800">
                  Roll-in
                </Badge>
              )}
              {issue.issue_code && (
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                  {issue.issue_code}
                </span>
              )}
              <Badge className={issue.status === "in_progress" 
                ? "bg-blue-100 text-blue-800" 
                : issue.status === "resolved"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
              }>
                {issue.status === "in_progress" && <Clock size={12} className="mr-1" />}
                {issue.status === "resolved" && <CheckCircle size={12} className="mr-1" />}
                {issue.status === "open" && <AlertTriangle size={12} className="mr-1" />}
                {issue.status.replace("_", " ")}
              </Badge>
              <Badge className={severityColors[issue.severity] || "bg-slate-100"}>
                {issue.severity}
              </Badge>
              <Badge variant="outline">{issue.issue_type}</Badge>
              
              {/* Warranty Status */}
              {issue.warranty_service_type ? (
                <Badge className={issue.warranty_service_type === "warranty" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
                }>
                  {issue.warranty_service_type === "warranty" ? (
                    <><Shield size={12} className="mr-1" /> Warranty</>
                  ) : (
                    <><ShieldOff size={12} className="mr-1" /> Non-Warranty</>
                  )}
                </Badge>
              ) : issue.warranty_status && (
                <Badge className={issue.warranty_status === "warranty" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
                }>
                  {issue.warranty_status === "warranty" ? "Warranty" : "Non-Warranty"}
                </Badge>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-900 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {issue.title}
            </h3>
            
            {/* Product Info */}
            <div className="text-sm text-slate-500 mt-1">
              <span>S/N: {getProductSerial(issue.product_id)}</span>
              <span className="mx-2">•</span>
              <span>Place: {getProductCity(issue.product_id)}</span>
            </div>
            
            {/* Product Location */}
            {issue.product_location && (
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium">Location:</span> {issue.product_location}
              </p>
            )}
            
            {/* Technician and SLA */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {issue.technician_name && (
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  <User size={14} />
                  {issue.technician_name}
                </span>
              )}
              
              {/* SLA Timer */}
              {sla && (
                <Badge className={`${sla.expired ? "bg-red-500 text-white" : sla.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                  <Timer size={12} className="mr-1" />
                  {sla.text}
                </Badge>
              )}
              
              {/* No SLA for non-warranty */}
              {issue.warranty_service_type === "non_warranty" && (
                <Badge variant="outline" className="text-slate-500">
                  No time limit
                </Badge>
              )}
            </div>
            
            {/* Non-warranty details */}
            {issue.warranty_service_type === "non_warranty" && (issue.estimated_fix_time || issue.estimated_cost) && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Non-Warranty Service Details:</p>
                <div className="flex gap-4 text-sm">
                  {issue.estimated_fix_time && (
                    <span><strong>Est. Fix Time:</strong> {issue.estimated_fix_time}</span>
                  )}
                  {issue.estimated_cost && (
                    <span><strong>Est. Cost:</strong> {issue.estimated_cost}</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Description */}
            <p className="text-slate-600 mt-3 whitespace-pre-line">{issue.description}</p>
            
            {/* Resolution */}
            {issue.resolution && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <strong>Resolution:</strong> {issue.resolution}
                </p>
              </div>
            )}
            
            {/* Timestamps */}
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
              <span>Registered: {new Date(issue.created_at).toLocaleString()}</span>
              {issue.technician_assigned_at && (
                <span>Assigned: {new Date(issue.technician_assigned_at).toLocaleString()}</span>
              )}
              {issue.resolved_at && (
                <span>Resolved: {new Date(issue.resolved_at).toLocaleString()}</span>
              )}
            </div>
            
            {/* Contact Details Button */}
            {showContactDetails && (
              <div className="mt-3">
                <ContactDetailsPopup 
                  issue={issue} 
                  products={products}
                />
              </div>
            )}
          </div>
          
          {/* Resolve Button */}
          {showResolveButton && onResolve && (
            <Button
              onClick={() => onResolve(issue)}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid={`resolve-issue-${issue.id}`}
            >
              <CheckCircle size={16} className="mr-2" />
              {t("issues.resolveIssue") || "Resolve Issue"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IssueCard;
export { severityColors, calculateSLARemaining };
