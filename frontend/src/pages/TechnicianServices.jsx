import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wrench, CalendarIcon, Clock, CheckCircle, Shield, ShieldOff, Timer, FileText, Play, AlertTriangle } from "lucide-react";

const TechnicianServices = ({ selectedTechnician }) => {
  const [issues, setIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveData, setResolveData] = useState({
    warranty_service_type: "",
    resolution: "",
    create_service_record: true,
  });

  useEffect(() => {
    if (selectedTechnician) {
      fetchData();
    }
  }, [selectedTechnician]);

  const fetchData = async () => {
    try {
      const [issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`),
      ]);
      
      // Filter by selected technician - include in_progress, in_service, and warranty route issues
      const technicianIssues = issuesRes.data.filter(
        i => i.technician_name === selectedTechnician && 
        (i.status === "in_progress" || i.status === "in_service" || i.is_warranty_route)
      );
      
      setIssues(technicianIssues);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const getProductCity = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.city || "Unknown";
  };

  // Calculate warranty repair time remaining (24h from when issue was resolved as warranty)
  const calculateRepairTimeRemaining = (issue) => {
    if (!issue.is_warranty_route || issue.status === "resolved") return null;
    
    // Get the created_at time of the warranty route issue (when parent was resolved as warranty)
    const createdAt = new Date(issue.created_at);
    const deadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: "Time Expired", urgent: true };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: `${hours}h ${minutes}m left`, urgent: hours < 6 };
    }
    return { expired: false, text: `${minutes}m left`, urgent: true };
  };

  // Calculate SLA time remaining for customer issues
  const calculateSLARemaining = (issue) => {
    if (issue.warranty_service_type === "non_warranty") return null;
    if (issue.source !== "customer" || issue.status === "resolved") return null;
    
    const createdAt = new Date(issue.created_at);
    const slaDeadline = new Date(createdAt.getTime() + 12 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = slaDeadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: "SLA Expired" };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { expired: false, text: `${hours}h ${minutes}m left`, urgent: hours < 2 };
    }
    return { expired: false, text: `${minutes}m left`, urgent: true };
  };

  const openResolveDialog = (issue) => {
    setSelectedIssue(issue);
    setResolveData({
      warranty_service_type: "",
      resolution: "",
      create_service_record: true,
    });
    setResolveDialogOpen(true);
  };

  const handleResolveIssue = async () => {
    if (!selectedIssue) return;
    try {
      await axios.put(`${API}/issues/${selectedIssue.id}`, {
        status: "resolved",
        resolution: resolveData.resolution,
        warranty_service_type: resolveData.warranty_service_type,
        create_service_record: resolveData.warranty_service_type === "non_warranty" ? resolveData.create_service_record : false,
      });
      
      let successMsg = "Issue resolved successfully";
      if (resolveData.warranty_service_type === "warranty" && !selectedIssue.is_warranty_route) {
        successMsg = "Issue moved to Service Records - Repair task created with 24h deadline";
      } else if (resolveData.warranty_service_type === "non_warranty" && resolveData.create_service_record) {
        successMsg = "Issue resolved & service record created";
      }
      
      toast.success(successMsg);
      setResolveDialogOpen(false);
      setSelectedIssue(null);
      setResolveData({
        warranty_service_type: "",
        resolution: "",
        create_service_record: true,
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve issue");
    }
  };

  const severityColors = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  // Separate issues into In Progress and Service Records
  const inProgressIssues = issues.filter(i => 
    i.status === "in_progress" && 
    !i.is_warranty_route && 
    !i.warranty_service_type // No service type yet
  );

  // Service Records: Issues that have been given a service type (warranty - now waiting for repair, or non-warranty resolved)
  // Also includes warranty route (repair) issues that are still open/in_progress
  const serviceRecordIssues = issues.filter(i => 
    i.is_warranty_route || // Warranty repair tasks
    i.status === "in_service" || // Parent issues waiting for child repair
    (i.warranty_service_type && i.status === "resolved") // Fully resolved with service type
  );

  if (!selectedTechnician) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-16 text-center">
            <Wrench className="mx-auto text-slate-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
              No Technician Selected
            </h2>
            <p className="text-slate-400 mt-2">
              Please select a technician from the Dashboard to view their services.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="technician-services">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Services
          </h1>
          <p className="text-slate-500 mt-1">
            Viewing services for {selectedTechnician}
          </p>
        </div>
      </div>

      {/* In Progress Issues Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Clock size={20} className="text-amber-500" />
            In Progress Issues ({inProgressIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : inProgressIssues.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Clock className="mx-auto text-slate-300 mb-2" size={32} />
              <p>No issues in progress</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Start Work&quot; on Calendar tasks to begin working</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inProgressIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${issue.source === "customer" ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {issue.source === "customer" && (
                          <Badge className="bg-purple-100 text-purple-800">Customer Reported</Badge>
                        )}
                        <Badge className="bg-blue-100 text-blue-800">
                          <Clock size={12} className="mr-1" />
                          In Progress
                        </Badge>
                        <Badge className={severityColors[issue.severity] || "bg-slate-100"}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline">{issue.issue_type}</Badge>
                        
                        {/* SLA Timer for customer issues */}
                        {issue.source === "customer" && (() => {
                          const sla = calculateSLARemaining(issue);
                          if (!sla) return null;
                          return (
                            <Badge className={`${sla.expired ? "bg-red-500 text-white" : sla.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                              <Timer size={12} className="mr-1" />
                              {sla.text}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {issue.issue_code && (
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                            {issue.issue_code}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {issue.title}
                        </h3>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        <span>S/N: {getProductSerial(issue.product_id)}</span>
                        <span className="mx-2">•</span>
                        <span>{getProductCity(issue.product_id)}</span>
                      </div>
                      {issue.product_location && (
                        <p className="text-sm text-slate-500 mt-1">
                          <span className="font-medium">Location:</span> {issue.product_location}
                        </p>
                      )}
                      <p className="text-slate-600 mt-2 whitespace-pre-line">{issue.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                        <span>Created: {new Date(issue.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    {/* Resolve Button */}
                    <Button
                      onClick={() => openResolveDialog(issue)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      data-testid="resolve-issue-btn"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Resolve Issue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Records Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <FileText size={20} className="text-emerald-500" />
            Service Records ({serviceRecordIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : serviceRecordIssues.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Wrench className="mx-auto text-slate-300 mb-2" size={32} />
              <p>No service records</p>
              <p className="text-xs text-slate-400 mt-1">Resolve issues with a service type to create records</p>
            </div>
          ) : (
            <div className="space-y-4">
              {serviceRecordIssues.map((issue) => {
                const repairTime = calculateRepairTimeRemaining(issue);
                const isRepairTask = issue.is_warranty_route;
                const isAwaitingRepair = issue.status === "in_service";
                const isResolved = issue.status === "resolved";
                
                return (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-lg border ${
                      isRepairTask && !isResolved
                        ? "bg-orange-50 border-orange-300"
                        : isAwaitingRepair
                        ? "bg-amber-50 border-amber-300"
                        : isResolved
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Status badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {isRepairTask && !isResolved && (
                            <Badge className="bg-orange-500 text-white">
                              <Wrench size={12} className="mr-1" />
                              Repair Task
                            </Badge>
                          )}
                          {isAwaitingRepair && (
                            <Badge className="bg-amber-500 text-white">
                              <Timer size={12} className="mr-1" />
                              Awaiting Repair
                            </Badge>
                          )}
                          {isResolved && (
                            <Badge className="bg-emerald-500 text-white">
                              <CheckCircle size={12} className="mr-1" />
                              Resolved
                            </Badge>
                          )}
                          
                          {/* Warranty Type Badge */}
                          {(issue.warranty_status === "warranty" || issue.warranty_service_type === "warranty") && (
                            <Badge className="bg-green-100 text-green-800">
                              <Shield size={12} className="mr-1" />
                              Warranty
                            </Badge>
                          )}
                          {issue.warranty_service_type === "non_warranty" && (
                            <Badge className="bg-gray-100 text-gray-800">
                              <ShieldOff size={12} className="mr-1" />
                              Non-Warranty
                            </Badge>
                          )}
                          
                          {/* 24h Timer for warranty repair tasks */}
                          {repairTime && (
                            <Badge className={`${repairTime.expired ? "bg-red-500 text-white animate-pulse" : repairTime.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                              <Timer size={12} className="mr-1" />
                              {repairTime.text}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Issue info */}
                        <div className="flex items-center gap-2 mt-1">
                          {issue.issue_code && (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                              {issue.issue_code}
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {issue.title}
                          </h3>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          <span>S/N: {getProductSerial(issue.product_id)}</span>
                          <span className="mx-2">•</span>
                          <span>{getProductCity(issue.product_id)}</span>
                        </div>
                        {issue.product_location && (
                          <p className="text-sm text-slate-500 mt-1">
                            <span className="font-medium">Location:</span> {issue.product_location}
                          </p>
                        )}
                        <p className="text-slate-600 mt-2 whitespace-pre-line line-clamp-2">{issue.description}</p>
                        
                        {/* Resolution info */}
                        {issue.resolution && (
                          <div className="mt-3 p-2 bg-white/50 rounded border border-slate-200">
                            <span className="text-xs text-slate-500">Resolution:</span>
                            <p className="text-sm text-slate-700">{issue.resolution}</p>
                          </div>
                        )}
                        
                        {/* Timestamps */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                          <span>Created: {new Date(issue.created_at).toLocaleString()}</span>
                          {issue.resolved_at && (
                            <span>Resolved: {new Date(issue.resolved_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {/* Resolve button for warranty repair tasks that aren't resolved yet */}
                        {isRepairTask && !isResolved && issue.status === "in_progress" && (
                          <Button
                            onClick={() => openResolveDialog(issue)}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            data-testid="resolve-repair-btn"
                          >
                            <CheckCircle size={16} className="mr-2" />
                            Complete Repair
                          </Button>
                        )}
                        
                        {/* Continue button for repair tasks that are open */}
                        {isRepairTask && issue.status === "open" && (
                          <Button
                            onClick={async () => {
                              try {
                                await axios.put(`${API}/issues/${issue.id}`, { status: "in_progress" });
                                toast.success("Started working on repair task");
                                fetchData();
                              } catch (error) {
                                toast.error("Failed to start repair");
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                            data-testid="continue-repair-btn"
                          >
                            <Play size={16} className="mr-2" />
                            Continue
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Issue Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
              {selectedIssue?.is_warranty_route ? "Complete Repair" : "Resolve Issue"}
            </DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 mt-4">
              {/* Issue Summary */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{selectedIssue.title}</p>
                <p className="text-sm text-slate-500">S/N: {getProductSerial(selectedIssue.product_id)}</p>
                {selectedIssue.issue_code && (
                  <span className="mt-1 inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                    {selectedIssue.issue_code}
                  </span>
                )}
              </div>
              
              {/* Warranty Service Type - only for non-warranty-route issues */}
              {!selectedIssue.is_warranty_route && (
                <div>
                  <Label>Service Type *</Label>
                  <Select
                    value={resolveData.warranty_service_type}
                    onValueChange={(value) => setResolveData({ ...resolveData, warranty_service_type: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="service-type-select">
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warranty">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-green-600" />
                          Warranty Service
                        </div>
                      </SelectItem>
                      <SelectItem value="non_warranty">
                        <div className="flex items-center gap-2">
                          <ShieldOff size={14} className="text-gray-600" />
                          Non-Warranty Service
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Warranty Service Info */}
              {resolveData.warranty_service_type === "warranty" && !selectedIssue.is_warranty_route && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle size={16} />
                    <span className="font-medium">Warranty Service</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    This will create a <strong>Repair Task</strong> with a <strong>24-hour deadline</strong>.
                    The original issue will remain in "Service Records" until the repair is completed.
                  </p>
                </div>
              )}
              
              {/* Non-Warranty indicator */}
              {resolveData.warranty_service_type === "non_warranty" && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    This service will be recorded as <strong>Non-Warranty</strong>
                  </p>
                </div>
              )}
              
              {/* For warranty repair tasks - pre-select warranty */}
              {selectedIssue.is_warranty_route && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <Shield size={16} />
                    <span className="font-medium">Warranty Repair Task</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Completing this repair will mark both the repair task and the original issue as resolved.
                  </p>
                </div>
              )}
              
              {/* Resolution Note */}
              <div>
                <Label htmlFor="resolution">Resolution Note *</Label>
                <Textarea
                  id="resolution"
                  value={resolveData.resolution}
                  onChange={(e) => setResolveData({ ...resolveData, resolution: e.target.value })}
                  placeholder="Describe how the issue was resolved..."
                  className="mt-1"
                  rows={4}
                  data-testid="resolution-textarea"
                />
              </div>
              
              {/* Auto-create service record checkbox - for non-warranty only */}
              {resolveData.warranty_service_type === "non_warranty" && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="create_service_record"
                    checked={resolveData.create_service_record}
                    onChange={(e) => setResolveData({ ...resolveData, create_service_record: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="create_service_record" className="text-sm text-blue-800">
                    Create Service Record
                  </label>
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveIssue}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    (!selectedIssue.is_warranty_route && !resolveData.warranty_service_type) || 
                    !resolveData.resolution.trim()
                  }
                  data-testid="confirm-resolve-btn"
                >
                  {selectedIssue.is_warranty_route ? "Complete Repair" : 
                   resolveData.warranty_service_type === "warranty" ? "Create Repair Task" : "Resolve Issue"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TechnicianServices;
