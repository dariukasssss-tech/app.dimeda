import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Wrench, CalendarIcon, User, Clock, CheckCircle, AlertTriangle, Shield, ShieldOff, Timer } from "lucide-react";

const TechnicianServices = ({ selectedTechnician }) => {
  const [services, setServices] = useState([]);
  const [issues, setIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolveData, setResolveData] = useState({
    warranty_service_type: "",
    resolution: "",
    estimated_fix_time: "",
    estimated_cost: "",
    create_service_record: true,
  });

  useEffect(() => {
    if (selectedTechnician) {
      fetchData();
    }
  }, [selectedTechnician]);

  const fetchData = async () => {
    try {
      const [servicesRes, issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`),
      ]);
      
      // Filter by selected technician
      const technicianServices = servicesRes.data.filter(
        s => s.technician_name === selectedTechnician
      );
      const technicianIssues = issuesRes.data.filter(
        i => i.technician_name === selectedTechnician && i.status === "in_progress"
      );
      
      setServices(technicianServices);
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

  // Calculate SLA time remaining
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
      estimated_fix_time: "",
      estimated_cost: "",
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
        estimated_fix_time: resolveData.warranty_service_type === "non_warranty" ? resolveData.estimated_fix_time : null,
        estimated_cost: resolveData.warranty_service_type === "non_warranty" ? resolveData.estimated_cost : null,
        create_service_record: resolveData.warranty_service_type === "non_warranty" ? resolveData.create_service_record : false,
      });
      const successMsg = resolveData.warranty_service_type === "non_warranty" && resolveData.create_service_record 
        ? "Issue resolved & service record created" 
        : "Issue resolved successfully";
      toast.success(successMsg);
      setResolveDialogOpen(false);
      setSelectedIssue(null);
      setResolveData({
        warranty_service_type: "",
        resolution: "",
        estimated_fix_time: "",
        estimated_cost: "",
        create_service_record: true,
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve issue");
    }
  };

  const serviceTypeColors = {
    maintenance: "bg-blue-100 text-blue-800",
    repair: "bg-amber-100 text-amber-800",
    inspection: "bg-emerald-100 text-emerald-800",
  };

  const severityColors = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

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

      {/* In Progress Issues - Can be resolved */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Clock size={20} className="text-amber-500" />
            In Progress Issues ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : issues.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Clock className="mx-auto text-slate-300 mb-2" size={32} />
              <p>No issues in progress</p>
              <p className="text-xs text-slate-400 mt-1">Mark issues as "In Progress" from the Calendar page</p>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${issue.source === "customer" ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"}`}
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
                        
                        {/* SLA Timer */}
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
                      <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {issue.title}
                      </h3>
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

      {/* Service Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <CheckCircle size={20} className="text-emerald-500" />
            Service Records ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : services.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Wrench className="mx-auto text-slate-300 mb-2" size={32} />
              No service records
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="p-4 rounded-lg border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className={serviceTypeColors[service.service_type] || "bg-slate-100"}>
                      {service.service_type}
                    </Badge>
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <CalendarIcon size={14} />
                      {new Date(service.service_date).toLocaleDateString()}
                    </span>
                    {service.warranty_status && (
                      <Badge className={service.warranty_status === "warranty" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {service.warranty_status === "warranty" ? "Warranty" : "Non-Warranty"}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    S/N: {getProductSerial(service.product_id)}
                  </h3>
                  <p className="text-slate-600 mt-2">{service.description}</p>
                  {service.issues_found && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Issues Found:</strong> {service.issues_found}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Issue Dialog - Same as Admin */}
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
              </div>
              
              {/* Warranty Service Type */}
              <div>
                <Label>Service Type *</Label>
                <Select
                  value={resolveData.warranty_service_type}
                  onValueChange={(value) => setResolveData({ ...resolveData, warranty_service_type: value })}
                >
                  <SelectTrigger className="mt-1">
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
              
              {/* Non-Warranty fields */}
              {resolveData.warranty_service_type === "non_warranty" && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Non-Warranty Service Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimated_fix_time">Estimated Fix Time (hours)</Label>
                      <Input
                        id="estimated_fix_time"
                        type="number"
                        value={resolveData.estimated_fix_time}
                        onChange={(e) => setResolveData({ ...resolveData, estimated_fix_time: e.target.value })}
                        placeholder="e.g., 2"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimated_cost">Estimated Cost (Eur)</Label>
                      <Input
                        id="estimated_cost"
                        type="number"
                        value={resolveData.estimated_cost}
                        onChange={(e) => setResolveData({ ...resolveData, estimated_cost: e.target.value })}
                        placeholder="e.g., 150"
                        className="mt-1"
                      />
                    </div>
                  </div>
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
                />
              </div>
              
              {/* Auto-create service record checkbox */}
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
                    Automatically create Service Record from this issue
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
                  disabled={!resolveData.warranty_service_type || !resolveData.resolution.trim()}
                >
                  Resolve Issue
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
