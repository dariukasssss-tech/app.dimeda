import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Timer, 
  MapPin, 
  Users, 
  Play, 
  CalendarDays, 
  CheckCircle, 
  AlertTriangle,
  Wrench,
  Shield
} from "lucide-react";
import { format, parseISO } from "date-fns";

/**
 * Calculate SLA time remaining
 */
const calculateSLARemaining = (item) => {
  if (!item.scheduled_date) return null;
  const deadline = parseISO(item.scheduled_date);
  const now = new Date();
  const diffMs = deadline - now;
  
  if (diffMs <= 0) {
    const overdue = Math.abs(diffMs);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return { expired: true, text: `Overdue ${hours}h ${minutes}m`, urgent: true };
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return { expired: false, text: `${hours}h ${minutes}m`, urgent: hours < 2 };
  }
  return { expired: false, text: `${minutes}m`, urgent: true };
};

/**
 * MaintenanceTaskCard - Reusable card for maintenance/scheduled tasks
 * 
 * @param {Object} props
 * @param {Object} props.item - The maintenance item
 * @param {Object} props.linkedIssue - The linked issue if any
 * @param {Object} props.product - The product info
 * @param {Function} props.onTaskClick - Callback when task is clicked
 * @param {Function} props.onStartWork - Callback for start work button
 * @param {Function} props.onSchedule - Callback for schedule button
 * @param {Function} props.onContinueRepair - Callback for continue repair button
 * @param {boolean} props.showActions - Whether to show action buttons
 */
const MaintenanceTaskCard = ({ 
  item, 
  linkedIssue, 
  product,
  onTaskClick,
  onStartWork,
  onSchedule,
  onContinueRepair,
  showActions = true
}) => {
  const isRollIn = product?.model_type === "roll_in";
  const isPendingSchedule = item.status === "pending_schedule";
  const isWarrantyRepair = item.source === "warranty_service" || linkedIssue?.is_warranty_route;
  const isResolved = linkedIssue?.status === "resolved";
  const canStartWork = item.source === "customer_issue" && item.status === "scheduled" && linkedIssue && !isResolved && !isRollIn;
  const canStartRollInWork = item.source === "customer_issue" && item.status === "scheduled" && linkedIssue && !isResolved && isRollIn;
  const canContinueRepair = isWarrantyRepair && item.status === "scheduled" && linkedIssue && !isResolved;
  
  const sla = !isRollIn && !isResolved && item.source === "customer_issue" && item.status !== "completed" 
    ? calculateSLARemaining(item) 
    : null;

  const getBorderColor = () => {
    if (isResolved || item.status === "completed") return "border-slate-800 bg-slate-50";
    if (isWarrantyRepair) return "border-orange-500 bg-orange-50";
    if (item.source === "customer_issue" && isRollIn) return "border-teal-500";
    if (item.source === "customer_issue") return "border-purple-500";
    if (item.source === "auto_yearly") return "border-emerald-500";
    if (item.priority === "12h") return "border-orange-500";
    return "border-blue-500";
  };

  return (
    <div
      className={`p-4 rounded-xl border-l-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer min-h-[160px] ${getBorderColor()}`}
      onClick={(e) => onTaskClick && onTaskClick(item, e)}
      data-testid={`maintenance-task-${item.id}`}
    >
      {/* Header with S/N and Status */}
      <div className="flex items-center justify-between mb-2 pr-12">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
            {product?.serial_number || "Unknown"}
          </span>
          {linkedIssue?.issue_code && (
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-mono">
              {linkedIssue.issue_code}
            </span>
          )}
        </div>
        <Badge className={`text-xs ${
          isResolved ? "bg-emerald-500 text-white" :
          item.status === "completed" ? "bg-slate-800 text-white" :
          item.status === "in_progress" ? "bg-blue-500 text-white" :
          isPendingSchedule ? "bg-amber-500 text-white" :
          "bg-slate-100 text-slate-700"
        }`}>
          {isResolved ? "resolved" : isPendingSchedule ? "Schedule" : item.status}
        </Badge>
      </div>
      
      {/* Warranty Repair indicator */}
      {isWarrantyRepair && !item.status === "completed" && !isResolved && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-orange-100 rounded-lg">
          <Wrench size={14} className="text-orange-600" />
          <span className="text-sm font-medium text-orange-800">Warranty Repair Task</span>
        </div>
      )}
      
      {/* City and Type */}
      <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
        <span className="flex items-center gap-1">
          <MapPin size={14} className="text-slate-400" />
          {product?.city || "Unknown"}
        </span>
        <span className="capitalize">
          {item.maintenance_type.replace("_", " ")}
        </span>
      </div>
      
      {/* Deadline/Schedule info */}
      {item.scheduled_date && !isPendingSchedule && !isRollIn && (
        <div className={`text-sm font-medium ${
          isWarrantyRepair ? "text-orange-700" :
          item.source === "customer_issue" ? "text-purple-700" : "text-slate-700"
        }`}>
          <Clock size={14} className="inline mr-1" />
          {isWarrantyRepair ? "Repair by: " : item.source === "customer_issue" ? "Solve by: " : ""}
          {format(parseISO(item.scheduled_date), "MMM d, yyyy HH:mm")}
        </div>
      )}
      
      {/* Roll-in scheduled date */}
      {item.scheduled_date && !isPendingSchedule && isRollIn && (
        <div className="text-sm font-medium text-teal-700">
          <Clock size={14} className="inline mr-1" />
          Scheduled: {format(parseISO(item.scheduled_date), "MMM d, yyyy HH:mm")}
        </div>
      )}
      
      {/* Pending Schedule message */}
      {isPendingSchedule && (
        <div className="text-sm text-amber-700 font-medium mb-2">
          <AlertTriangle size={14} className="inline mr-1" />
          Please schedule this task
        </div>
      )}
      
      {/* Tags and Action Button */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isWarrantyRepair && (
            <Badge className="text-xs bg-orange-100 text-orange-800">
              <Shield size={10} className="mr-1" />
              Warranty
            </Badge>
          )}
          {item.source === "customer_issue" && isRollIn && !isWarrantyRepair && (
            <Badge className="text-xs bg-teal-100 text-teal-800">
              Roll-in
            </Badge>
          )}
          {item.source === "customer_issue" && !isWarrantyRepair && !isRollIn && (
            <Badge className="text-xs bg-purple-100 text-purple-800">
              <Users size={10} className="mr-1" />
              Customer
            </Badge>
          )}
          {item.source === "auto_yearly" && (
            <Badge className="text-xs bg-emerald-100 text-emerald-800">Yearly</Badge>
          )}
          {/* SLA timer */}
          {sla && (
            <Badge className={`text-xs ${sla.expired ? "bg-red-500 text-white" : sla.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
              <Timer size={10} className="mr-1" />
              {sla.text}
            </Badge>
          )}
          {/* Resolved badge */}
          {isResolved && (
            <Badge className="text-xs bg-emerald-100 text-emerald-800">
              <CheckCircle size={10} className="mr-1" />
              Resolved
            </Badge>
          )}
        </div>
        
        {/* Action Buttons */}
        {showActions && (
          <>
            {isPendingSchedule && isRollIn && onSchedule && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSchedule(item);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                data-testid="schedule-btn"
              >
                <CalendarDays size={14} className="mr-1" />
                Schedule
              </Button>
            )}
            
            {canStartRollInWork && onStartWork && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartWork(item);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                data-testid="start-work-btn"
              >
                <Play size={14} className="mr-1" />
                Start Work
              </Button>
            )}
            
            {canStartWork && !isWarrantyRepair && onStartWork && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartWork(item);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="start-work-btn"
              >
                <Play size={14} className="mr-1" />
                Start Work
              </Button>
            )}
            
            {canContinueRepair && onContinueRepair && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onContinueRepair(item);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
                data-testid="continue-repair-btn"
              >
                <Play size={14} className="mr-1" />
                Continue
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MaintenanceTaskCard;
