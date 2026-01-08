import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, AlertTriangle, Camera, X, MoreVertical, CheckCircle, Clock, Trash2, Eye, Settings, ChevronDown, ListFilter, User, Timer } from "lucide-react";

// Inspection checklist items (same as in Export.jsx)
const VISUAL_INSPECTION = [
  "All mechanical and screw connections are sealed",
  "All welds are intact, without cracks or breaks",
  "All components are in good order, not broken or bent",
  "The mattress cover is not torn, has no cracks or holes",
  "Belts not frayed or torn",
  "Belt stitching is not loose or frayed",
];

const FUNCTIONALITY_INSPECTION = [
  "Adjustable backrest or headrest works properly",
  "Adjustable footrest or shank works properly",
  "The stretchers are easy to manoeuvre and rotate 360°",
  "The side rails work properly",
  "The loading wheels turn freely",
  "Wheel brakes work properly",
  "The front swivel wheel lock works properly",
  "All levers are intact and working properly",
  "All fastening straps and buckles work properly",
  "The monoblock can be easily loaded into and unloaded from the vehicle",
  "The monoblock works properly in all height positions",
  "Indicators working properly",
  "The nut on the locking pin is properly tightened",
];

// Beta version technician list
const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3"];

// Filter button card component - moved outside to avoid re-creation
const FilterCard = ({ title, value, icon: Icon, color, isActive, onClick, testId }) => (
  <Card 
    className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-offset-2 ring-[#0066CC] scale-[1.02]' : 'hover:scale-[1.02]'}`}
    data-testid={testId}
    onClick={onClick}
  >
    <CardContent className="pt-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {value}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="text-white" size={20} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const Issues = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    product_id: "",
    issue_type: "",
    severity: "",
    title: "",
    description: "",
    technician_name: "",
    warranty_status: "",
  });
  
  // Warranty options
  const WARRANTY_OPTIONS = ["Warranty", "Non Warranty"];
  
  // Multi-select states for "other" issue type
  const [selectedVisualIssues, setSelectedVisualIssues] = useState([]);
  const [selectedFunctionalityIssues, setSelectedFunctionalityIssues] = useState([]);
  const [visualPopoverOpen, setVisualPopoverOpen] = useState(false);
  const [functionalityPopoverOpen, setFunctionalityPopoverOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`),
      ]);
      setIssues(issuesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      issue_type: "",
      severity: "",
      title: "",
      description: "",
      technician_name: "",
      warranty_status: "",
    });
    setPhotos([]);
    setSelectedVisualIssues([]);
    setSelectedFunctionalityIssues([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build description with inspection items if "other" type
      let finalDescription = formData.description;
      
      if (formData.issue_type === "other") {
        const inspectionDetails = [];
        if (selectedVisualIssues.length > 0) {
          inspectionDetails.push("Visual Inspection Issues:\n- " + selectedVisualIssues.join("\n- "));
        }
        if (selectedFunctionalityIssues.length > 0) {
          inspectionDetails.push("Functionality Inspection Issues:\n- " + selectedFunctionalityIssues.join("\n- "));
        }
        if (inspectionDetails.length > 0) {
          finalDescription = inspectionDetails.join("\n\n") + "\n\nAdditional Notes:\n" + formData.description;
        }
      }

      await axios.post(`${API}/issues`, {
        ...formData,
        description: finalDescription,
        photos: photos,
      });
      toast.success("Issue reported successfully");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to report issue");
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    try {
      await axios.put(`${API}/issues/${issueId}`, { status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await axios.delete(`${API}/issues/${id}`);
      toast.success("Issue deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete issue");
    }
  };

  const handleTechnicianChange = async (issueId, technicianName) => {
    try {
      await axios.put(`${API}/issues/${issueId}`, { technician_name: technicianName });
      toast.success(`Assigned to ${technicianName}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to assign technician");
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

  // Calculate SLA time remaining for customer issues
  const calculateSLARemaining = (issue) => {
    if (issue.source !== "customer" || issue.status === "resolved" || !issue.technician_name) return null;
    
    // SLA is 12 hours from issue creation
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

  // Calculate counts for each status
  const issueCounts = {
    all: issues.length,
    open: issues.filter(i => i.status === "open").length,
    in_progress: issues.filter(i => i.status === "in_progress").length,
    resolved: issues.filter(i => i.status === "resolved").length,
  };

  const handleFilterChange = (newFilter) => {
    setStatusFilter(newFilter);
    if (newFilter === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ status: newFilter });
    }
  };

  const filteredIssues = statusFilter === "all"
    ? issues
    : issues.filter((i) => i.status === statusFilter);

  const statusIcons = {
    open: <AlertTriangle size={16} className="text-amber-500" />,
    in_progress: <Clock size={16} className="text-blue-500" />,
    resolved: <CheckCircle size={16} className="text-emerald-500" />,
  };

  const toggleVisualItem = (item) => {
    setSelectedVisualIssues(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const toggleFunctionalityItem = (item) => {
    setSelectedFunctionalityIssues(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="issues-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Issues
          </h1>
          <p className="text-slate-500 mt-1">Track and resolve equipment problems</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#FA4616] hover:bg-[#D9380D]" data-testid="report-issue-btn">
              <Plus size={18} className="mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="issue-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Report New Issue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="issue-select-product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.serial_number} - {product.model_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Type *</Label>
                  <Select
                    value={formData.issue_type}
                    onValueChange={(value) => {
                      setFormData({ ...formData, issue_type: value });
                      // Reset inspection selections when type changes
                      if (value !== "other") {
                        setSelectedVisualIssues([]);
                        setSelectedFunctionalityIssues([]);
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1" data-testid="issue-select-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mechanical">Mechanical</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="cosmetic">Cosmetic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="issue-select-severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Assign Technician</Label>
                <Select
                  value={formData.technician_name}
                  onValueChange={(value) => setFormData({ ...formData, technician_name: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="issue-select-technician">
                    <SelectValue placeholder="Select technician (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {TECHNICIANS.map((tech) => (
                      <SelectItem key={tech} value={tech}>
                        {tech}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Warranty Status *</Label>
                <Select
                  value={formData.warranty_status}
                  onValueChange={(value) => setFormData({ ...formData, warranty_status: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="issue-select-warranty">
                    <SelectValue placeholder="Select warranty status" />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt.toLowerCase().replace(' ', '_')}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  data-testid="issue-input-title"
                  className="mt-1"
                />
              </div>

              {/* Conditional Inspection Lists - Only show when issue_type is "other" */}
              {formData.issue_type === "other" && (
                <>
                  {/* Visual Inspection Multi-Select */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Eye size={16} className="text-[#0066CC]" />
                      Visual Inspection
                    </Label>
                    <Popover open={visualPopoverOpen} onOpenChange={setVisualPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-between text-left font-normal"
                          data-testid="visual-inspection-select"
                        >
                          <span className={selectedVisualIssues.length === 0 ? "text-slate-500" : ""}>
                            {selectedVisualIssues.length === 0 
                              ? "Select visual inspection issues" 
                              : `${selectedVisualIssues.length} item(s) selected`}
                          </span>
                          <ChevronDown size={16} className="text-slate-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <div className="p-3 border-b bg-slate-50">
                          <p className="text-sm font-medium">Select failed inspection items</p>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto p-2">
                          {VISUAL_INSPECTION.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                              onClick={() => toggleVisualItem(item)}
                            >
                              <Checkbox
                                checked={selectedVisualIssues.includes(item)}
                                onCheckedChange={() => toggleVisualItem(item)}
                                className="mt-0.5"
                              />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {selectedVisualIssues.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedVisualIssues.map((item, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1"
                          >
                            {item.substring(0, 30)}...
                            <X 
                              size={12} 
                              className="cursor-pointer hover:text-red-900" 
                              onClick={() => toggleVisualItem(item)}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Functionality Inspection Multi-Select */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Settings size={16} className="text-[#0066CC]" />
                      Functionality Inspection
                    </Label>
                    <Popover open={functionalityPopoverOpen} onOpenChange={setFunctionalityPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-between text-left font-normal"
                          data-testid="functionality-inspection-select"
                        >
                          <span className={selectedFunctionalityIssues.length === 0 ? "text-slate-500" : ""}>
                            {selectedFunctionalityIssues.length === 0 
                              ? "Select functionality inspection issues" 
                              : `${selectedFunctionalityIssues.length} item(s) selected`}
                          </span>
                          <ChevronDown size={16} className="text-slate-400" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <div className="p-3 border-b bg-slate-50">
                          <p className="text-sm font-medium">Select failed inspection items</p>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto p-2">
                          {FUNCTIONALITY_INSPECTION.map((item, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                              onClick={() => toggleFunctionalityItem(item)}
                            >
                              <Checkbox
                                checked={selectedFunctionalityIssues.includes(item)}
                                onCheckedChange={() => toggleFunctionalityItem(item)}
                                className="mt-0.5"
                              />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {selectedFunctionalityIssues.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedFunctionalityIssues.map((item, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1"
                          >
                            {item.substring(0, 30)}...
                            <X 
                              size={12} 
                              className="cursor-pointer hover:text-red-900" 
                              onClick={() => toggleFunctionalityItem(item)}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={formData.issue_type === "other" 
                    ? "Additional notes about the issues..." 
                    : "Detailed description of the problem..."}
                  required
                  data-testid="issue-input-description"
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label>Photos (Optional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    ref={fileInputRef}
                    className="hidden"
                    data-testid="issue-photo-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera size={18} className="mr-2" />
                    Add Photos
                  </Button>
                </div>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Upload ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FA4616] hover:bg-[#D9380D]"
                  disabled={!formData.product_id || !formData.issue_type || !formData.severity || !formData.title || !formData.description}
                  data-testid="submit-issue-btn"
                >
                  Report Issue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <FilterCard
          title="All Issues"
          value={issueCounts.all}
          icon={ListFilter}
          color="bg-slate-600"
          isActive={statusFilter === "all"}
          onClick={() => handleFilterChange("all")}
          testId="filter-all"
        />
        <FilterCard
          title="Open"
          value={issueCounts.open}
          icon={AlertTriangle}
          color="bg-[#FA4616]"
          isActive={statusFilter === "open"}
          onClick={() => handleFilterChange("open")}
          testId="filter-open"
        />
        <FilterCard
          title="In Progress"
          value={issueCounts.in_progress}
          icon={Clock}
          color="bg-[#0066CC]"
          isActive={statusFilter === "in_progress"}
          onClick={() => handleFilterChange("in_progress")}
          testId="filter-in-progress"
        />
        <FilterCard
          title="Resolved"
          value={issueCounts.resolved}
          icon={CheckCircle}
          color="bg-emerald-500"
          isActive={statusFilter === "resolved"}
          onClick={() => handleFilterChange("resolved")}
          testId="filter-resolved"
        />
      </div>

      {/* Issues List */}
      <div className="space-y-4" data-testid="issues-list">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">Loading...</CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">No issues found</p>
              <p className="text-sm text-slate-400 mt-1">Report an issue when you find equipment problems</p>
            </CardContent>
          </Card>
        ) : (
          filteredIssues.map((issue) => (
            <Card 
              key={issue.id} 
              className={`card-hover ${issue.source === "customer" ? "bg-slate-50 border-slate-300" : ""}`}
              data-testid={`issue-card-${issue.id}`}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Customer badge */}
                      {issue.source === "customer" && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Customer Reported
                        </span>
                      )}
                      <span className={`status-badge status-${issue.status}`}>
                        {statusIcons[issue.status]}
                        <span className="ml-1">{issue.status.replace("_", " ")}</span>
                      </span>
                      <span className={`status-badge severity-${issue.severity}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {issue.issue_type}
                      </span>
                    </div>
                    <h3 className={`text-lg font-semibold mt-3 ${issue.source === "customer" ? "text-slate-700" : "text-slate-900"}`} style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {issue.title}
                    </h3>
                    
                    {/* Product info with City for customer issues */}
                    <div className={`text-sm mt-1 ${issue.source === "customer" ? "text-slate-500" : "text-slate-500"}`}>
                      <span>S/N: {getProductSerial(issue.product_id)}</span>
                      {issue.source === "customer" && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Place: {getProductCity(issue.product_id)}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Product Location for customer issues */}
                    {issue.source === "customer" && issue.product_location && (
                      <p className="text-sm text-slate-500 mt-1">
                        <span className="font-medium">Location:</span> {issue.product_location}
                      </p>
                    )}
                    
                    {/* Technician Assignment */}
                    <div className="flex items-center gap-2 mt-2">
                      <User size={14} className="text-slate-400" />
                      {issue.technician_name ? (
                        // Technician already assigned - show locked display
                        <div className="flex items-center gap-2">
                          <span className="h-7 px-3 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-medium text-slate-700 flex items-center">
                            {issue.technician_name}
                          </span>
                          <span className="text-xs text-slate-400 italic">
                            (Mark as Open to reassign)
                          </span>
                        </div>
                      ) : (
                        // No technician - show dropdown to assign
                        <Select
                          value={issue.technician_name || ""}
                          onValueChange={(value) => handleTechnicianChange(issue.id, value)}
                        >
                          <SelectTrigger className="h-7 w-40 text-xs">
                            <SelectValue placeholder="Assign technician" />
                          </SelectTrigger>
                          <SelectContent>
                            {TECHNICIANS.map((tech) => (
                              <SelectItem key={tech} value={tech}>
                                {tech}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* SLA Timer for customer issues with technician assigned */}
                      {issue.source === "customer" && issue.technician_name && issue.status !== "resolved" && (() => {
                        const sla = calculateSLARemaining(issue);
                        if (!sla) return null;
                        return (
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            sla.expired ? "bg-red-500 text-white" : 
                            sla.urgent ? "bg-orange-500 text-white" : 
                            "bg-amber-100 text-amber-800"
                          }`}>
                            <Timer size={12} />
                            {sla.text}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Warranty Status Badge */}
                    {issue.warranty_status && (
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          issue.warranty_status === "warranty" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {issue.warranty_status === "warranty" ? "Warranty" : "Non Warranty"}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-slate-600 mt-2 whitespace-pre-line">{issue.description}</p>
                    {issue.resolution && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-emerald-800">
                          <strong>Resolution:</strong> {issue.resolution}
                        </p>
                      </div>
                    )}
                    {issue.photos && issue.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {issue.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Issue photo ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                      <span>Registered: {new Date(issue.created_at).toLocaleString()}</span>
                      {issue.resolved_at && (
                        <span>Resolved: {new Date(issue.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`issue-menu-${issue.id}`}>
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {issue.status !== "open" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(issue.id, "open")}>
                          <AlertTriangle size={14} className="mr-2" /> Mark as Open
                        </DropdownMenuItem>
                      )}
                      {issue.status !== "in_progress" && issue.status !== "resolved" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(issue.id, "in_progress")}>
                          <Clock size={14} className="mr-2" /> Mark In Progress
                        </DropdownMenuItem>
                      )}
                      {issue.status === "in_progress" && (
                        <DropdownMenuItem disabled className="text-slate-400">
                          <CheckCircle size={14} className="mr-2" /> Resolve from Services page
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(issue.id)}
                        className="text-red-600"
                      >
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Remove old Resolve Dialog - resolution is now only from Service page */}
    </div>
  );
};

export default Issues;
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                className="mt-1"
                rows={4}
                data-testid="resolution-input"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!resolution.trim()}
                data-testid="confirm-resolve-btn"
              >
                Resolve Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Issues;
