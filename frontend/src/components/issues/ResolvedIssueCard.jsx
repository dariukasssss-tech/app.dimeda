import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/TranslationContext";
import ContactDetailsPopup from "@/components/ContactDetailsPopup";
import { CheckCircle, Shield, ShieldOff, FileText, Wrench } from "lucide-react";

/**
 * ResolvedIssueCard - Card component for displaying resolved issues
 * 
 * @param {Object} props
 * @param {Object} props.issue - The resolved issue data
 * @param {Array} props.products - List of all products
 * @param {Function} props.onClick - Callback when card is clicked
 * @param {boolean} props.isWarranty - Whether this is a warranty issue
 * @param {boolean} props.showContactDetails - Whether to show contact details button
 */
const ResolvedIssueCard = ({ 
  issue, 
  products, 
  onClick,
  isWarranty = true,
  showContactDetails = true
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

  // Check if this issue has both Inspection Note and Service Note (warranty repair completed)
  const hasInspectionNote = !!issue.resolution;
  const hasServiceNote = !!issue.service_note;
  const isWarrantyRepairCompleted = hasInspectionNote && hasServiceNote;

  return (
    <Card 
      className={`border-l-4 ${isWarranty ? "border-green-500" : "border-gray-400"} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
      data-testid={`resolved-${isWarranty ? "warranty" : "non-warranty"}-${issue.id}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {issue.issue_code && (
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                  {issue.issue_code}
                </span>
              )}
              <Badge className="bg-emerald-100 text-emerald-800">
                <CheckCircle size={12} className="mr-1" />
                Resolved
              </Badge>
              <Badge className={isWarranty ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {isWarranty ? (
                  <><Shield size={12} className="mr-1" /> Warranty</>
                ) : (
                  <><ShieldOff size={12} className="mr-1" /> Non-Warranty</>
                )}
              </Badge>
              {/* Spare Parts Used indicator */}
              {issue.spare_parts_used && (
                <Badge className="bg-blue-100 text-blue-800">
                  Spare Parts Used
                </Badge>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-semibold text-slate-900 mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {issue.title}
            </h3>
            
            {/* Product Info */}
            <div className="text-sm text-slate-500 mt-1">
              <span>S/N: {getProductSerial(issue.product_id)}</span>
              <span className="mx-2">•</span>
              <span>{getProductCity(issue.product_id)}</span>
            </div>
            
            {/* Inspection Note (first stage diagnosis) */}
            {hasInspectionNote && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 mb-1">
                  <FileText size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Inspection Note</span>
                </div>
                <p className="text-sm text-blue-900">{issue.resolution}</p>
              </div>
            )}
            
            {/* Service Note (warranty repair completion) */}
            {hasServiceNote && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 text-orange-800 mb-1">
                  <Wrench size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Service Note</span>
                </div>
                <p className="text-sm text-orange-900">{issue.service_note}</p>
              </div>
            )}
            
            {/* Spare Parts Details */}
            {issue.spare_parts_used && issue.spare_parts && (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide">Spare Parts</span>
                </div>
                <p className="text-sm text-slate-700">{issue.spare_parts}</p>
              </div>
            )}
            
            {/* Non-warranty specific info */}
            {!isWarranty && (issue.estimated_fix_time || issue.estimated_cost) && (
              <div className="flex gap-4 text-sm text-slate-600 mt-2">
                {issue.estimated_fix_time && <span>Time: {issue.estimated_fix_time}h</span>}
                {issue.estimated_cost && <span>Cost: {issue.estimated_cost} Eur</span>}
              </div>
            )}
            
            {/* Resolved timestamp */}
            {issue.resolved_at && (
              <p className="text-xs text-slate-400 mt-2">
                Resolved: {new Date(issue.resolved_at).toLocaleString()}
              </p>
            )}
            
            {/* Click hint for warranty */}
            {isWarranty && onClick && (
              <p className="text-xs text-blue-600 mt-1">Click to view full track</p>
            )}
            
            {/* Contact Details Button */}
            {showContactDetails && (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <ContactDetailsPopup 
                  issue={issue} 
                  products={products}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResolvedIssueCard;
