import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Plus, CheckCircle, Clock, MapPin, Filter, Calendar } from "lucide-react";

// Cities list
const CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];

// Status filter options for customer view
const STATUS_FILTERS = [
  { value: "all", label: "All Conditions" },
  { value: "reported", label: "Reported" },
  { value: "registered", label: "Registered" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const CustomerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formData, setFormData] = useState({
    selected_city: "",
    product_id: "",
    issue_type: "",
    title: "",
    description: "",
    product_location: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, issuesRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/issues`),
      ]);
      setProducts(productsRes.data);
      setMyIssues(issuesRes.data.filter(i => i.source === "customer"));
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Filter products by selected city
  const filteredProducts = formData.selected_city
    ? products.filter(p => p.city === formData.selected_city)
    : [];

  // Get display status for customer - "Registered" when technician assigned
  const getDisplayStatus = (issue) => {
    if (issue.status === "resolved") return "resolved";
    if (issue.status === "in_progress") return "in_progress";
    if (issue.technician_name && issue.status === "open") return "registered";
    return "reported"; // open without technician = reported
  };

  // Get the latest relevant date for sorting
  const getLatestDate = (issue) => {
    const displayStatus = getDisplayStatus(issue);
    if (displayStatus === "resolved" && issue.resolved_at) {
      return new Date(issue.resolved_at);
    }
    if ((displayStatus === "registered" || displayStatus === "in_progress") && issue.technician_assigned_at) {
      return new Date(issue.technician_assigned_at);
    }
    return new Date(issue.created_at);
  };

  // Filter issues by city and status, then sort by latest date
  const filteredIssues = myIssues
    .filter(issue => {
      // City filter
      if (cityFilter !== "all") {
        const product = products.find(p => p.id === issue.product_id);
        if (product?.city !== cityFilter) return false;
      }
      // Status filter
      if (statusFilter !== "all") {
        const displayStatus = getDisplayStatus(issue);
        if (displayStatus !== statusFilter) return false;
      }
      return true;
    })
    .sort((a, b) => getLatestDate(b) - getLatestDate(a)); // Latest date on top

  const handleCityChange = (city) => {
    setFormData({ 
      ...formData, 
      selected_city: city,
      product_id: "" // Reset product when city changes
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const selectedProduct = products.find(p => p.id === formData.product_id);
      
      await axios.post(`${API}/issues/customer`, {
        product_id: formData.product_id,
        issue_type: formData.issue_type,
        title: formData.title,
        description: formData.description,
        product_location: formData.product_location,
        severity: "high",
        source: "customer",
      });
      
      // Show success message
      setSuccessMessage({
        title: formData.title,
        serial: selectedProduct?.serial_number || "Unknown",
        city: selectedProduct?.city || "Unknown",
        time: new Date().toLocaleString(),
      });
      
      toast.success("Issue reported successfully! Our team will be notified.");
      setDialogOpen(false);
      setFormData({
        selected_city: "",
        product_id: "",
        issue_type: "",
        title: "",
        description: "",
        product_location: "",
      });
      fetchData();
      
      // Clear success message after 30 seconds
      setTimeout(() => setSuccessMessage(null), 30000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to report issue");
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

  const statusIcons = {
    reported: <AlertTriangle size={16} className="text-amber-500" />,
    registered: <CheckCircle size={16} className="text-blue-500" />,
    in_progress: <Clock size={16} className="text-blue-500" />,
    resolved: <CheckCircle size={16} className="text-emerald-500" />,
  };

  const statusColors = {
    reported: "bg-amber-100 text-amber-800",
    registered: "bg-blue-100 text-blue-800",
    in_progress: "bg-blue-100 text-blue-800",
    resolved: "bg-emerald-100 text-emerald-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Issue Registration
          </h1>
          <p className="text-slate-500 mt-1">
            Report issues with your Medirol equipment
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]">
              <Plus size={18} className="mr-2" />
              Report New Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Report New Issue
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Place (City) - First field */}
              <div>
                <Label>Place (City) *</Label>
                <Select
                  value={formData.selected_city}
                  onValueChange={handleCityChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product - Filtered by city */}
              <div>
                <Label>Product (Serial Number) *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  disabled={!formData.selected_city}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={formData.selected_city ? "Select product" : "Select city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No products in this city
                      </SelectItem>
                    ) : (
                      filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.serial_number} - {product.model_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.selected_city && filteredProducts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No products registered in {formData.selected_city}</p>
                )}
              </div>

              {/* Issue Type */}
              <div>
                <Label>Issue Type *</Label>
                <Select
                  value={formData.issue_type}
                  onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">Mechanical</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="cosmetic">Cosmetic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product Location - Text input instead of warranty dropdown */}
              <div>
                <Label htmlFor="product_location">Product Location</Label>
                <Input
                  id="product_location"
                  value={formData.product_location}
                  onChange={(e) => setFormData({ ...formData, product_location: e.target.value })}
                  placeholder="Enter product location address"
                  className="mt-1"
                />
              </div>

              {/* Issue Title */}
              <div>
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  className="mt-1"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the issue in detail..."
                  required
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#0066CC] hover:bg-[#0052A3]"
                  disabled={!formData.product_id || !formData.issue_type || !formData.title || !formData.description}
                >
                  Submit Issue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card - How it works */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-900">How it works</p>
              <p className="text-sm text-blue-700 mt-1">
                When you submit an issue, our service team will be notified immediately. 
                All customer-reported issues are automatically marked as high priority. 
                You can track the status of your issues below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Message - Shows after successful issue registration */}
      {successMessage && (
        <Card className="bg-emerald-50 border-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-emerald-600 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-medium text-emerald-900">Issue Registered Successfully!</p>
                <div className="text-sm text-emerald-700 mt-2 space-y-1">
                  <p><strong>Issue:</strong> {successMessage.title}</p>
                  <p><strong>Product S/N:</strong> {successMessage.serial}</p>
                  <p><strong>City:</strong> {successMessage.city}</p>
                  <p><strong>Submitted:</strong> {successMessage.time}</p>
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  Our service team has been notified and will review your issue shortly.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reported Issues */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Reported Issues</CardTitle>
              <CardDescription>Track the status of your submitted issues</CardDescription>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              {/* City Filter */}
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-36" data-testid="city-filter">
                  <SelectValue placeholder="Filter by city" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Status/Condition Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="status-filter">
                  <SelectValue placeholder="Filter by condition" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredIssues.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">
                {cityFilter === "all" && statusFilter === "all" 
                  ? "No issues reported yet" 
                  : `No issues found with current filters`}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {cityFilter === "all" && statusFilter === "all" 
                  ? 'Click "Report New Issue" to get started' 
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIssues.map((issue) => {
                const displayStatus = getDisplayStatus(issue);
                return (
                  <div 
                    key={issue.id} 
                    className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    data-testid={`issue-card-${issue.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {statusIcons[displayStatus]}
                          {issue.issue_code && (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-mono">
                              {issue.issue_code}
                            </span>
                          )}
                          <h3 className="font-medium text-slate-900">{issue.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[displayStatus]}`}>
                            {displayStatus.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {getProductCity(issue.product_id)}
                          </span>
                          {" • "}S/N: {getProductSerial(issue.product_id)} • {issue.issue_type}
                        </p>
                        {issue.product_location && (
                          <p className="text-xs text-slate-400 mt-1">
                            Location: {issue.product_location}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mt-2">{issue.description}</p>
                        
                        {/* Technician assignment info for registered/in_progress issues */}
                        {issue.technician_name && displayStatus !== "resolved" && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                            <strong>Assigned to:</strong> {issue.technician_name}
                            {issue.technician_assigned_at && (
                              <span className="ml-2 text-blue-600">
                                (Registered: {new Date(issue.technician_assigned_at).toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Resolution info for resolved issues */}
                        {displayStatus === "resolved" && (
                          <div className="mt-2 p-3 bg-emerald-50 rounded border border-emerald-100">
                            {issue.resolution && (
                              <p className="text-sm text-emerald-800 mb-2">
                                <strong>Resolution:</strong> {issue.resolution}
                              </p>
                            )}
                            {/* Show all 3 dates for resolved issues */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-700">
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={12} />
                                <strong>Reported:</strong> {new Date(issue.created_at).toLocaleString()}
                              </span>
                              {issue.technician_assigned_at && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} />
                                  <strong>Registered:</strong> {new Date(issue.technician_assigned_at).toLocaleString()}
                                </span>
                              )}
                              {issue.resolved_at && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} />
                                  <strong>Resolved:</strong> {new Date(issue.resolved_at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Show reported date for non-resolved issues */}
                        {displayStatus !== "resolved" && (
                          <p className="text-xs text-slate-400 mt-2">
                            Reported: {new Date(issue.created_at).toLocaleString()}
                          </p>
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
    </div>
  );
};

export default CustomerDashboard;
