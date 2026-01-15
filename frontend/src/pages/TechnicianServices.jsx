import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
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
import { 
  Wrench, CalendarIcon, Clock, CheckCircle, Shield, ShieldOff, Timer, 
  FileText, Play, AlertTriangle, MapPin, User, ChevronDown, Eye
} from "lucide-react";

const TechnicianServices = ({ selectedTechnician }) => {
  const [issues, setIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedRepairId, setSelectedRepairId] = useState("");
  
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
      
      // Filter by selected technician
      const technicianIssues = issuesRes.data.filter(
        i => i.technician_name === selectedTechnician && 
        (i.status === "in_progress" || i.status === "in_service")
      );
      
      setIssues(technicianIssues);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const getProduct = (productId) => products.find((p) => p.id === productId);
  const getProductSerial = (productId) => getProduct(productId)?.serial_number || "Unknown";
  const getProductCity = (productId) => getProduct(productId)?.city || "Unknown";

  // Calculate warranty repair time remaining (24h from warranty_repair_started_at)
  const calculateRepairTimeRemaining = (issue) => {
    if (issue.status !== "in_service" && issue.status !== "in_progress") return null;
    if (!issue.warranty_repair_started_at && !issue.warranty_service_type) return null;
    
    const startTime = issue.warranty_repair_started_at || issue.created_at;
    const startDate = new Date(startTime);
    const deadline = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline - now;
    
    if (diffMs <= 0) {
      return { expired: true, text: "Time Expired", urgent: true };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { 
      expired: false, 
      text: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`, 
      urgent: hours < 6 
    };
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
    
    return { 
      expired: false, 
      text: hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`, 
      urgent: hours < 2 
    };
  };

  const openDetailDialog = (issue) => {
    setSelectedIssue(issue);
    setSelectedRepairId(issue.current_repair_id || (issue.repair_attempts?.[0]?.id) || "");
    setDetailDialogOpen(true);
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

  // Start/Continue repair work
  const handleStartRepair = async () => {
    if (!selectedIssue) return;
    try {
      await axios.put(`${API}/issues/${selectedIssue.id}`, {
        start_repair: true,
        repair_id: selectedRepairId
      });
      toast.success("Started working on repair");
      setDetailDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to start repair");
    }
  };

  // Complete repair work
  const handleCompleteRepair = async (notes) => {
    if (!selectedIssue) return;
    try {
      await axios.put(`${API}/issues/${selectedIssue.id}`, {
        complete_repair: true,
        repair_id: selectedRepairId,
        repair_notes: notes
      });
      toast.success("Repair completed - Issue resolved");
      setDetailDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Failed to complete repair");
    }
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
      if (resolveData.warranty_service_type === "warranty") {
        successMsg = "Issue moved to Awaiting Repair - Click to continue working";
      }
      
      toast.success(successMsg);
      setResolveDialogOpen(false);
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

  // Separate issues
  const inProgressIssues = issues.filter(i => 
    i.status === "in_progress" && !i.warranty_service_type
  );

  const serviceRecordIssues = issues.filter(i => 
    i.status === "in_service" || 
    (i.status === "in_progress" && i.warranty_service_type === "warranty")
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

  // Render issue card
  const renderIssueCard = (issue, isServiceRecord = false) => {
    const product = getProduct(issue.product_id);
    const slaTime = calculateSLARemaining(issue);
    const repairTime = calculateRepairTimeRemaining(issue);
    const isAwaitingRepair = issue.status === "in_service";
    const isRepairing = issue.status === "in_progress" && issue.warranty_service_type === "warranty";
    const repairAttempts = issue.repair_attempts || [];
    
    return (
      <div
        key={issue.id}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
          isAwaitingRepair 
            ? "bg-orange-50 border-orange-300 hover:border-orange-500" 
            : isRepairing
            ? "bg-blue-50 border-blue-300 hover:border-blue-500"
            : issue.source === "customer" 
            ? "bg-purple-50 border-purple-200 hover:border-purple-400" 
            : "bg-white border-slate-200 hover:border-slate-400"
        }`}
        onClick={() => isServiceRecord ? openDetailDialog(issue) : openResolveDialog(issue)}
        data-testid={`issue-card-${issue.id}`}
      >
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAwaitingRepair && (
                <Badge className="bg-orange-500 text-white">
                  <Timer size={12} className="mr-1" />
                  Awaiting Repair
                </Badge>
              )}
              {isRepairing && (
                <Badge className="bg-blue-500 text-white">
                  <Wrench size={12} className="mr-1" />
                  Repairing
                </Badge>
              )}
              {!isServiceRecord && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Clock size={12} className="mr-1" />
                  In Progress
                </Badge>
              )}
              {issue.warranty_service_type === "warranty" && (
                <Badge className="bg-green-100 text-green-800">
                  <Shield size={12} className="mr-1" />
                  Warranty
                </Badge>
              )}
              {issue.source === "customer" && !isServiceRecord && (
                <Badge className="bg-purple-100 text-purple-800">Customer</Badge>
              )}
            </div>
            
            {/* Timer badges */}
            <div className="flex items-center gap-2">
              {repairTime && (
                <Badge className={`${repairTime.expired ? "bg-red-500 text-white animate-pulse" : repairTime.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                  <Timer size={12} className="mr-1" />
                  {repairTime.text}
                </Badge>
              )}
              {slaTime && !repairTime && (
                <Badge className={`${slaTime.expired ? "bg-red-500 text-white" : slaTime.urgent ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-800"}`}>
                  <Timer size={12} className="mr-1" />
                  {slaTime.text}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Issue Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                {issue.issue_code}
              </span>
              <Badge className={severityColors[issue.severity] || "bg-slate-100"} variant="outline">
                {issue.severity}
              </Badge>
            </div>
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {issue.title}
            </h3>
          </div>
          
          {/* Product Info */}
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <FileText size={14} />
              S/N: {product?.serial_number || "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={14} />
              {product?.city || "Unknown"}
            </span>
          </div>
          
          {/* Repair attempts indicator */}
          {repairAttempts.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Wrench size={12} />
              <span>{repairAttempts.length} repair attempt{repairAttempts.length > 1 ? 's' : ''}</span>
            </div>
          )}
          
          {/* Click hint */}
          <div className="flex items-center justify-end">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Eye size={12} />
              Click for details
            </span>
          </div>
        </div>
      </div>
    );
  };

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
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressIssues.map((issue) => renderIssueCard(issue, false))}
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
            <div className="grid gap-4 md:grid-cols-2">
              {serviceRecordIssues.map((issue) => renderIssueCard(issue, true))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Dialog (for Service Records / Awaiting Repair) */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <FileText size={24} className="text-blue-600" />
              Issue Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedIssue && (() => {
            const product = getProduct(selectedIssue.product_id);
            const repairTime = calculateRepairTimeRemaining(selectedIssue);
            const repairAttempts = selectedIssue.repair_attempts || [];
            const isAwaitingRepair = selectedIssue.status === "in_service";
            const isRepairing = selectedIssue.status === "in_progress" && selectedIssue.warranty_service_type === "warranty";
            
            return (
              <div className="space-y-6 mt-4">
                {/* Status Banner */}
                <div className={`p-4 rounded-xl ${
                  isAwaitingRepair ? "bg-orange-100 border-2 border-orange-300" : 
                  isRepairing ? "bg-blue-100 border-2 border-blue-300" : 
                  "bg-slate-100 border-2 border-slate-300"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isAwaitingRepair && <Timer size={24} className="text-orange-600" />}
                      {isRepairing && <Wrench size={24} className="text-blue-600" />}
                      <div>
                        <h3 className="font-bold text-lg">
                          {isAwaitingRepair ? "Awaiting Repair" : isRepairing ? "Repair In Progress" : "In Progress"}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {isAwaitingRepair ? "Click Continue to start repair work" : 
                           isRepairing ? "Complete the repair to resolve issue" : "Working on issue"}
                        </p>
                      </div>
                    </div>
                    {repairTime && (
                      <Badge className={`text-lg px-4 py-2 ${repairTime.expired ? "bg-red-500 text-white animate-pulse" : repairTime.urgent ? "bg-orange-500 text-white" : "bg-amber-200 text-amber-900"}`}>
                        <Timer size={16} className="mr-2" />
                        {repairTime.text}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Issue Info */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-800 font-mono font-bold">
                      {selectedIssue.issue_code}
                    </span>
                    <Badge className={severityColors[selectedIssue.severity]}>
                      {selectedIssue.severity}
                    </Badge>
                    <Badge variant="outline">{selectedIssue.issue_type}</Badge>
                    {selectedIssue.warranty_service_type === "warranty" && (
                      <Badge className="bg-green-100 text-green-800">
                        <Shield size={12} className="mr-1" />
                        Warranty
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {selectedIssue.title}
                  </h2>
                  <p className="text-slate-600 whitespace-pre-line">{selectedIssue.description}</p>
                </div>
                
                {/* Product Info */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText size={18} />
                    Product Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Serial Number:</span>
                      <p className="font-bold text-slate-900">{product?.serial_number || "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">City:</span>
                      <p className="font-bold text-slate-900">{product?.city || "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Model:</span>
                      <p className="font-bold text-slate-900">{product?.model_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="font-bold text-slate-900">{selectedIssue.product_location || product?.location_detail || "N/A"}</p>
                    </div>
                  </div>
                </div>
                
                {/* Repair Attempts (if more than 1) */}
                {repairAttempts.length > 1 && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Wrench size={18} />
                      Repair Attempts ({repairAttempts.length})
                    </h4>
                    <Select value={selectedRepairId} onValueChange={setSelectedRepairId}>
                      <SelectTrigger className="w-full bg-white" data-testid="repair-select">
                        <SelectValue placeholder="Select repair attempt" />
                      </SelectTrigger>
                      <SelectContent>
                        {repairAttempts.map((repair, idx) => (
                          <SelectItem key={repair.id} value={repair.id}>
                            <div className="flex items-center gap-2">
                              <span>Repair #{idx + 1}</span>
                              <Badge className={
                                repair.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                                repair.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                                "bg-amber-100 text-amber-800"
                              }>
                                {repair.status}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {new Date(repair.started_at).toLocaleDateString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Show selected repair notes */}
                    {selectedRepairId && repairAttempts.find(r => r.id === selectedRepairId)?.notes && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200">
                        <span className="text-xs text-slate-500">Notes:</span>
                        <p className="text-sm text-slate-700">{repairAttempts.find(r => r.id === selectedRepairId)?.notes}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Resolution notes (if any) */}
                {selectedIssue.resolution && (
                  <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-300">
                    <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Resolution Notes</h4>
                    <p className="text-base font-semibold text-slate-800 mt-2 whitespace-pre-line">{selectedIssue.resolution}</p>
                  </div>
                )}
                
                {/* Timestamps */}
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Created: {new Date(selectedIssue.created_at).toLocaleString()}</span>
                  {selectedIssue.warranty_repair_started_at && (
                    <span>Repair Started: {new Date(selectedIssue.warranty_repair_started_at).toLocaleString()}</span>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                    Close
                  </Button>
                  
                  {isAwaitingRepair && (
                    <Button 
                      onClick={handleStartRepair}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-6"
                      data-testid="continue-btn"
                    >
                      <Play size={18} className="mr-2" />
                      Continue
                    </Button>
                  )}
                  
                  {isRepairing && (
                    <Button 
                      onClick={() => handleCompleteRepair(selectedIssue.resolution)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                      data-testid="complete-repair-btn"
                    >
                      <CheckCircle size={18} className="mr-2" />
                      Complete Repair
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Resolve Issue Dialog (for In Progress issues) */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Resolve Issue</DialogTitle>
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
              
              {/* Service Type */}
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
              
              {/* Warranty Service Info */}
              {resolveData.warranty_service_type === "warranty" && (
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-800 mb-2">
                    <AlertTriangle size={18} />
                    <span className="font-bold">Warranty Service</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    This will move the issue to <strong>Awaiting Repair</strong> with a <strong>24-hour deadline</strong>.
                    No new issue code is generated - repair is tracked on this issue.
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
              
              {/* Resolution Note */}
              <div>
                <Label htmlFor="resolution">Resolution Note *</Label>
                <Textarea
                  id="resolution"
                  value={resolveData.resolution}
                  onChange={(e) => setResolveData({ ...resolveData, resolution: e.target.value })}
                  placeholder="Describe the issue diagnosis and resolution..."
                  className="mt-1"
                  rows={4}
                  data-testid="resolution-textarea"
                />
              </div>
              
              {/* Service record checkbox for non-warranty */}
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
                  className={resolveData.warranty_service_type === "warranty" ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  disabled={!resolveData.warranty_service_type || !resolveData.resolution.trim()}
                  data-testid="confirm-resolve-btn"
                >
                  {resolveData.warranty_service_type === "warranty" ? "Start Warranty Repair" : "Resolve Issue"}
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
