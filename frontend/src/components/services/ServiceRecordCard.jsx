import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/TranslationContext";
import { CalendarIcon, User, Trash2, Shield, ShieldOff } from "lucide-react";

/**
 * Service type color mapping
 */
const serviceTypeColors = {
  maintenance: "bg-blue-100 text-blue-800",
  repair: "bg-amber-100 text-amber-800",
  inspection: "bg-emerald-100 text-emerald-800",
};

/**
 * ServiceRecordCard - Card component for displaying service records
 * 
 * @param {Object} props
 * @param {Object} props.service - The service record data
 * @param {Function} props.getProductSerial - Function to get product serial number
 * @param {Function} props.onDelete - Callback when delete button is clicked
 */
const ServiceRecordCard = ({ 
  service, 
  getProductSerial,
  onDelete
}) => {
  const { t } = useTranslation();

  return (
    <Card className="card-hover" data-testid={`service-card-${service.id}`}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${serviceTypeColors[service.service_type] || 'bg-slate-100 text-slate-800'}`}>
                {service.service_type}
              </span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <CalendarIcon size={14} />
                {new Date(service.service_date).toLocaleDateString()}
              </span>
              {/* Warranty Status Badge */}
              {service.warranty_status && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  service.warranty_status === "warranty" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {service.warranty_status === "warranty" ? (
                    <><Shield size={12} /> Warranty</>
                  ) : (
                    <><ShieldOff size={12} /> Non Warranty</>
                  )}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-slate-900 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              S/N: {getProductSerial(service.product_id)}
            </h3>
            
            <p className="text-slate-600 mt-2">{service.description}</p>
            
            {service.issues_found && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>{t("services.issuesFound") || "Issues Found"}:</strong> {service.issues_found}
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <User size={14} />
                {service.technician_name}
              </span>
            </div>
          </div>
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(service.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid={`delete-service-${service.id}`}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceRecordCard;
export { serviceTypeColors };
