import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
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

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedModelType, setSelectedModelType] = useState("");
  const [scheduledMaintenance, setScheduledMaintenance] = useState([]);
  const [formData, setFormData] = useState({
    selected_city: "",
    product_id: "",
    issue_type: "",
    title: "",
    description: "",
    product_location: "",
  });

  // Status filter options for customer view
  const STATUS_FILTERS = [
    { value: "all", label: t("common.filter") },
    { value: "reported", label: t("issues.status.open") },
    { value: "registered", label: t("calendar.scheduled") },
    { value: "in_progress", label: t("issues.status.inProgress") },
    { value: "resolved", label: t("issues.status.resolved") },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, issuesRes, maintenanceRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/issues`),
        axios.get(`${API}/scheduled-maintenance`),
      ]);
      setProducts(productsRes.data);
      setMyIssues(issuesRes.data.filter(i => i.source === "customer"));
      setScheduledMaintenance(maintenanceRes.data);
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // Get product model type
  const getProductModelType = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.model_type || "powered";
  };

  // Get scheduled maintenance for an issue
  const getMaintenanceForIssue = (issueId) => {
    return scheduledMaintenance.find(m => m.issue_id === issueId);
  };

  // Filter products by selected city and model type
  const filteredProducts = products.filter(p => {
    if (formData.selected_city && p.city !== formData.selected_city) return false;
    if (selectedModelType && selectedModelType !== "all" && p.model_type !== selectedModelType) return false;
    return true;
  }).filter(p => formData.selected_city ? p.city === formData.selected_city : true);

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
        serial: selectedProduct?.serial_number || t("common.noData"),
        city: selectedProduct?.city || t("common.noData"),
        time: new Date().toLocaleString(),
      });
      
      toast.success(t("customer.issueReported"));
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
      toast.error(error.response?.data?.detail || t("common.error"));
    }
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || t("common.noData");
  };

  const getProductCity = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.city || t("common.noData");
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

  const getStatusLabel = (status) => {
    switch(status) {
      case "reported": return t("issues.status.open");
      case "registered": return t("calendar.scheduled");
      case "in_progress": return t("issues.status.inProgress");
      case "resolved": return t("issues.status.resolved");
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t("customer.reportIssue")}
          </h1>
          <p className="text-slate-500 mt-1">
            {t("issues.description")}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]">
              <Plus size={18} className="mr-2" />
              {t("customer.reportIssue")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {t("customer.reportIssue")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Place (City) - First field */}
              <div>
                <Label>{t("products.city")} *</Label>
                <Select
                  value={formData.selected_city}
                  onValueChange={handleCityChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("products.city")} />
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

              {/* Model Type Filter */}
              <div>
                <Label>{t("products.modelType")}</Label>
                <Select
                  value={selectedModelType || "all"}
                  onValueChange={(value) => {
                    setSelectedModelType(value === "all" ? "" : value);
                    setFormData({ ...formData, product_id: "" }); // Reset product when type changes
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("products.allTypes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("products.allTypes")}</SelectItem>
                    <SelectItem value="powered">{t("products.poweredStretcher")}</SelectItem>
                    <SelectItem value="roll_in">{t("products.rollInStretcher")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product - Filtered by city and model type */}
              <div>
                <Label>{t("products.serialNumber")} *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  disabled={!formData.selected_city}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={formData.selected_city ? t("products.serialNumber") : t("products.city")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.length === 0 ? (
                      <SelectItem value="none" disabled>
                        {t("products.noProducts")}
                      </SelectItem>
                    ) : (
                      filteredProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.serial_number}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.selected_city && filteredProducts.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">{t("products.noProducts")} {formData.selected_city}</p>
                )}
              </div>

              {/* Issue Type */}
              <div>
                <Label>{t("issues.issueType")} *</Label>
                <Select
                  value={formData.issue_type}
                  onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("issues.issueType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">{t("issues.types.mechanical")}</SelectItem>
                    <SelectItem value="electrical">{t("issues.types.electrical")}</SelectItem>
                    <SelectItem value="cosmetic">Cosmetic</SelectItem>
                    <SelectItem value="other">{t("issues.types.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Product Location - Text input instead of warranty dropdown */}
              <div>
                <Label htmlFor="product_location">{t("customer.productLocation")}</Label>
                <Input
                  id="product_location"
                  value={formData.product_location}
                  onChange={(e) => setFormData({ ...formData, product_location: e.target.value })}
                  placeholder={t("customer.productLocation")}
                  className="mt-1"
                />
              </div>

              {/* Issue Title */}
              <div>
                <Label htmlFor="title">{t("issues.title")} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t("issues.description")}
                  required
                  className="mt-1"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <Label htmlFor="description">{t("issues.description")} *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("issues.description")}
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
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#0066CC] hover:bg-[#0052A3]"
                  disabled={!formData.product_id || !formData.issue_type || !formData.title || !formData.description}
                >
                  {t("common.confirm")}
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
              <p className="font-medium text-blue-900">{t("common.warning")}</p>
              <p className="text-sm text-blue-700 mt-1">
                {t("messages.issueCreated")}
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
                <p className="font-medium text-emerald-900">{t("common.success")}!</p>
                <div className="text-sm text-emerald-700 mt-2 space-y-1">
                  <p><strong>{t("issues.title")}:</strong> {successMessage.title}</p>
                  <p><strong>{t("products.serialNumber")}:</strong> {successMessage.serial}</p>
                  <p><strong>{t("products.city")}:</strong> {successMessage.city}</p>
                  <p><strong>Submitted:</strong> {successMessage.time}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100"
              >
                {t("common.close")}
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
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>{t("customer.myIssues")}</CardTitle>
              <CardDescription>{t("customer.trackIssue")}</CardDescription>
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              {/* City Filter */}
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="w-36" data-testid="city-filter">
                  <SelectValue placeholder={t("products.city")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.filter")}</SelectItem>
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
                  <SelectValue placeholder={t("common.filter")} />
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
                {t("issues.noIssues")}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {t("customer.reportIssue")}
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
                            {getStatusLabel(displayStatus)}
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
                            {t("products.location")}: {issue.product_location}
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mt-2">{issue.description}</p>
                        
                        {/* Technician assignment info for registered/in_progress issues */}
                        {issue.technician_name && displayStatus !== "resolved" && (() => {
                          const isRollIn = getProductModelType(issue.product_id) === "roll_in";
                          const maintenance = getMaintenanceForIssue(issue.id);
                          const isPendingSchedule = maintenance?.status === "pending_schedule";
                          const scheduledDate = maintenance?.scheduled_date;
                          
                          return (
                            <div className={`mt-2 p-2 rounded text-sm ${isRollIn ? "bg-teal-50 text-teal-800" : "bg-blue-50 text-blue-800"}`}>
                              <strong>{t("technician.assignedTo")}:</strong> {issue.technician_name}
                              {isRollIn ? (
                                // Roll-in Stretcher: Show scheduled date or "Pending Schedule"
                                isPendingSchedule || !scheduledDate ? (
                                  <span className="ml-2 text-amber-600 font-medium">
                                    (Awaiting Schedule)
                                  </span>
                                ) : (
                                  <span className="ml-2 text-teal-600">
                                    (Scheduled: {new Date(scheduledDate).toLocaleString()})
                                  </span>
                                )
                              ) : (
                                // Powered Stretcher: Show SLA deadline
                                issue.technician_assigned_at && (
                                  <span className="ml-2 text-blue-600">
                                    (Solve by: {new Date(new Date(issue.created_at).getTime() + 12 * 60 * 60 * 1000).toLocaleString()})
                                  </span>
                                )
                              )}
                              {isRollIn && (
                                <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                  Roll-in
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Resolution info for resolved issues */}
                        {displayStatus === "resolved" && (
                          <div className="mt-2 p-3 bg-emerald-50 rounded border border-emerald-100">
                            {issue.resolution && (
                              <p className="text-sm text-emerald-800 mb-2">
                                <strong>{t("issues.resolution")}:</strong> {issue.resolution}
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
                                  <strong>{t("calendar.scheduled")}:</strong> {new Date(issue.technician_assigned_at).toLocaleString()}
                                </span>
                              )}
                              {issue.resolved_at && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar size={12} />
                                  <strong>{t("issues.status.resolved")}:</strong> {new Date(issue.resolved_at).toLocaleString()}
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
