import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import ContactDetailsPopup from "@/components/ContactDetailsPopup";
import { Clock, Shield, User, FileText, CheckCircle } from "lucide-react";

/**
 * InServiceIssueCard - Card component for issues in warranty service
 * 
 * @param {Object} props
 * @param {Object} props.issue - The issue in service
 * @param {Object} props.linkedServiceIssue - The linked warranty service issue
 * @param {Array} props.products - List of all products
 * @param {Function} props.onComplete - Callback when complete button is clicked
 * @param {Function} props.onViewTrack - Callback when view track button is clicked
 * @param {boolean} props.showContactDetails - Whether to show contact details button
 */
const InServiceIssueCard = ({ 
  issue, 
  linkedServiceIssue,
  products, 
  onComplete,
  onViewTrack,
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

  return (
    <Card 
      className="border-l-4 border-amber-500"
      data-testid={`in-service-${issue.id}`}
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
              <Badge className="bg-amber-100 text-amber-800">
                <Clock size={12} className="mr-1" />
                In Service
              </Badge>
              <Badge className="bg-green-100 text-green-800">
                <Shield size={12} className="mr-1" />
                Warranty
              </Badge>
              {linkedServiceIssue && (
                <Badge variant="outline" className="text-purple-700 border-purple-300">
                  Service: {linkedServiceIssue.issue_code}
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
            
            {/* Resolution */}
            {issue.resolution && (
              <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded">
                <strong>Resolution:</strong> {issue.resolution}
              </p>
            )}
            
            {/* Assigned Technician */}
            {linkedServiceIssue?.technician_name && (
              <p className="text-sm text-purple-700 mt-2 flex items-center gap-1">
                <User size={14} />
                Assigned to: {linkedServiceIssue.technician_name}
              </p>
            )}
            
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
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {onComplete && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (linkedServiceIssue) {
                    onComplete(linkedServiceIssue);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!linkedServiceIssue}
              >
                <CheckCircle size={14} className="mr-1" />
                {t("services.completeService") || "Complete Service"}
              </Button>
            )}
            {onViewTrack && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewTrack(issue.id);
                }}
              >
                <FileText size={14} className="mr-1" />
                {t("issues.viewTrack") || "View Track"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InServiceIssueCard;
