import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { 
  Plus, Search, Package, MapPin, Calendar as CalendarIcon, Trash2, Edit, Building2, 
  Eye, AlertTriangle, Wrench, Clock, CheckCircle, XCircle, ChevronRight, Timer, User
} from "lucide-react";
import { format, addYears } from "date-fns";
import ContactDetailsPopup from "@/components/ContactDetailsPopup";

const CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];

// Calculate SLA remaining time for customer issues
const calculateSLARemaining = (issue) => {
  // Only for customer issues with technician assigned and not resolved
  if (issue.source !== "customer" || !issue.technician_name || !issue.technician_assigned_at) {
    return null;
  }
  
  // Parse SLA from issue or use default 12h
  const slaHours = issue.sla_hours || 12;
  const assignedAt = new Date(issue.technician_assigned_at);
  const deadline = new Date(assignedAt.getTime() + slaHours * 60 * 60 * 1000);
  const now = new Date();
  const remaining = deadline - now;
  
  if (remaining <= 0) {
    const overdue = Math.abs(remaining);
    const hours = Math.floor(overdue / (1000 * 60 * 60));
    const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
    return {
      expired: true,
      urgent: false,
      text: `Overdue ${hours}h ${minutes}m`
    };
  }
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    expired: false,
    urgent: hours < 2,
    text: `${hours}h ${minutes}m left`
  };
};

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [modelTypeFilter, setModelTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetails, setProductDetails] = useState({ issues: [], services: [], maintenance: [] });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    serial_number: "",
    model_name: "",
    model_type: "powered",
    city: "",
    location_detail: "",
    notes: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetails = async (product) => {
    setDetailsLoading(true);
    try {
      const [issuesRes, servicesRes, maintenanceRes] = await Promise.all([
        axios.get(`${API}/issues?product_id=${product.id}`),
        axios.get(`${API}/services?product_id=${product.id}`),
        axios.get(`${API}/scheduled-maintenance?product_id=${product.id}`),
      ]);
      setProductDetails({
        issues: issuesRes.data,
        services: servicesRes.data,
        maintenance: maintenanceRes.data,
      });
    } catch (error) {
      toast.error("Failed to fetch product details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setDetailSheetOpen(true);
    fetchProductDetails(product);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        registration_date: selectedDate.toISOString(),
      };
      
      if (editProduct) {
        await axios.put(`${API}/products/${editProduct.id}`, payload);
        toast.success(t("messages.productUpdated") || "Product updated!");
      } else {
        await axios.post(`${API}/products`, payload);
        toast.success(t("messages.productCreated") || "Product registered!");
      }
      setDialogOpen(false);
      setEditProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("common.error"));
    }
  };

  const resetForm = () => {
    setFormData({ serial_number: "", model_name: "", model_type: "powered", city: "", location_detail: "", notes: "" });
    setSelectedDate(new Date());
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setFormData({
      serial_number: product.serial_number,
      model_name: product.model_name,
      model_type: product.model_type || "powered",
      city: product.city || "",
      location_detail: product.location_detail || "",
      notes: product.notes || "",
    });
    if (product.registration_date) {
      setSelectedDate(new Date(product.registration_date));
    } else {
      setSelectedDate(new Date());
    }
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("messages.confirmDelete"))) return;
    try {
      await axios.delete(`${API}/products/${id}`);
      toast.success(t("messages.productDeleted") || "Product deleted");
      fetchProducts();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location_detail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === "all" || p.city === cityFilter;
    const matchesModelType = modelTypeFilter === "all" || p.model_type === modelTypeFilter;
    return matchesSearch && matchesCity && matchesModelType;
  });

  const productsByCity = CITIES.reduce((acc, city) => {
    acc[city] = products.filter((p) => p.city === city).length;
    return acc;
  }, {});

  const getMaintenanceDates = () => {
    const dates = [];
    for (let i = 1; i <= 5; i++) {
      dates.push(format(addYears(selectedDate, i), "MMM d, yyyy"));
    }
    return dates;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "bg-amber-100 text-amber-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-emerald-100 text-emerald-800";
      case "completed": return "bg-slate-100 text-slate-800";
      case "scheduled": return "bg-amber-100 text-amber-800";
      case "cancelled": return "bg-slate-100 text-slate-500";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-amber-100 text-amber-800";
      case "low": return "bg-slate-100 text-slate-600";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t("products.title")}
          </h1>
          <p className="text-slate-500 mt-1">{t("products.manageProducts") || "Manage registered stretchers"} ({products.length} {t("dashboard.stats.totalProducts").toLowerCase()})</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditProduct(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="add-product-btn">
              <Plus size={18} className="mr-2" />
              {t("products.addProduct")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="product-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                {editProduct ? t("products.editProduct") : t("products.addProduct")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="serial_number">{t("products.serialNumber")} *</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder={t("products.serialNumber")}
                  required
                  data-testid="input-serial-number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model_name">{t("products.modelName")}</Label>
                <Input
                  id="model_name"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  placeholder={t("products.modelName")}
                  data-testid="input-model-name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("products.modelType")} *</Label>
                <Select
                  value={formData.model_type}
                  onValueChange={(value) => setFormData({ ...formData, model_type: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-model-type">
                    <SelectValue placeholder={t("products.modelType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="powered">{t("products.poweredStretcher")}</SelectItem>
                    <SelectItem value="roll_in">{t("products.rollInStretcher")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("products.city")} *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-city">
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
              
              <div>
                <Label>{t("products.installDate")} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal"
                      data-testid="select-registration-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="location_detail">{t("products.location")}</Label>
                <Input
                  id="location_detail"
                  value={formData.location_detail}
                  onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
                  placeholder={t("products.location")}
                  data-testid="input-location-detail"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">{t("products.notes") || "Notes"}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t("products.notes") || "Additional information..."}
                  data-testid="input-notes"
                  className="mt-1"
                />
              </div>
              
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-medium text-emerald-800 mb-2">
                  <CalendarIcon size={14} className="inline mr-1" />
                  {t("maintenance.yearlySchedule") || "Yearly Maintenance Schedule"}:
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs text-emerald-700">
                  {getMaintenanceDates().map((date, idx) => (
                    <div key={idx}>{t("maintenance.year") || "Year"} {idx + 1}: {date}</div>
                  ))}
                </div>
                {editProduct && (
                  <p className="text-xs text-emerald-600 mt-2 italic">
                    * {t("maintenance.recalculateNote") || "Changing the date will recalculate all yearly maintenance"}
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#0066CC] hover:bg-[#0052A3]" 
                  data-testid="submit-product-btn"
                  disabled={!formData.serial_number || !formData.city || !formData.model_name}
                >
                  {editProduct ? t("common.save") : t("products.addProduct")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* City Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {CITIES.map((city) => (
          <Card 
            key={city} 
            className={`cursor-pointer transition-all ${cityFilter === city ? 'ring-2 ring-[#0066CC]' : ''}`}
            onClick={() => setCityFilter(cityFilter === city ? "all" : city)}
            data-testid={`city-stat-${city}`}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">{city}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {productsByCity[city]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input
                placeholder="Search by serial number or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-products"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="filter-city">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modelTypeFilter} onValueChange={setModelTypeFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="filter-model-type">
                <SelectValue placeholder={t("products.modelType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("products.allTypes")}</SelectItem>
                <SelectItem value="powered">{t("products.poweredStretcher")}</SelectItem>
                <SelectItem value="roll_in">{t("products.rollInStretcher")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card data-testid="products-table-card">
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">No products found</p>
              <p className="text-sm text-slate-400 mt-1">Register your first stretcher to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Next Maintenance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const regDate = new Date(product.registration_date);
                    const nextMaint = addYears(regDate, 1);
                    return (
                      <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                        <TableCell className="font-medium">{product.serial_number}</TableCell>
                        <TableCell>{product.model_name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Building2 size={14} className="text-[#0066CC]" />
                            {product.city}
                          </span>
                        </TableCell>
                        <TableCell>
                          {product.location_detail ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} className="text-slate-400" />
                              {product.location_detail}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-slate-500">
                            <CalendarIcon size={14} />
                            {format(regDate, "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-emerald-600 font-medium text-sm">
                            {format(nextMaint, "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                            {product.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(product)}
                              className="text-[#0066CC]"
                              data-testid={`view-product-${product.id}`}
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              data-testid={`edit-product-${product.id}`}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`delete-product-${product.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="product-detail-sheet">
          {selectedProduct && (
            <>
              <SheetHeader>
                <SheetTitle style={{ fontFamily: 'Manrope, sans-serif' }} className="flex items-center gap-2">
                  <Package className="text-[#0066CC]" size={24} />
                  {selectedProduct.serial_number}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Product Info */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Model</span>
                        <p className="font-medium">{selectedProduct.model_name}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">City</span>
                        <p className="font-medium flex items-center gap-1">
                          <Building2 size={14} className="text-[#0066CC]" />
                          {selectedProduct.city}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Location</span>
                        <p className="font-medium">{selectedProduct.location_detail || "-"}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Registered</span>
                        <p className="font-medium">{format(new Date(selectedProduct.registration_date), "PPP")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {detailsLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading details...</div>
                ) : (
                  (() => {
                    // Filter issues: non-resolved for Issues tab, resolved for Services tab
                    const activeIssues = productDetails.issues.filter(i => i.status !== "resolved");
                    const resolvedIssues = productDetails.issues.filter(i => i.status === "resolved");
                    // Filter maintenance: only yearly maintenance
                    const yearlyMaintenance = productDetails.maintenance.filter(m => m.source === "auto_yearly");
                    
                    return (
                  <Tabs defaultValue="issues" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="issues" className="flex items-center gap-1">
                        <AlertTriangle size={14} />
                        Issues ({activeIssues.length})
                      </TabsTrigger>
                      <TabsTrigger value="services" className="flex items-center gap-1">
                        <Wrench size={14} />
                        Services ({resolvedIssues.length})
                      </TabsTrigger>
                      <TabsTrigger value="maintenance" className="flex items-center gap-1">
                        <CalendarIcon size={14} />
                        Maintenance ({yearlyMaintenance.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Issues Tab - Active issues only (open, in_progress) */}
                    <TabsContent value="issues" className="mt-4">
                      {activeIssues.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <AlertTriangle className="mx-auto text-slate-300 mb-2" size={32} />
                          No active issues for this product
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productDetails.issues.map((issue) => {
                            const isRollIn = selectedProduct?.model_type === "roll_in";
                            const isResolved = issue.status === "resolved";
                            // Calculate SLA only for powered stretchers
                            const sla = !isRollIn && !isResolved ? calculateSLARemaining(issue) : null;
                            
                            // Border color logic matching Maintenance tab
                            const getBorderColor = () => {
                              if (isResolved) return "#1F2937"; // dark gray for resolved
                              if (isRollIn) return "#14B8A6"; // teal for roll-in
                              if (issue.source === "customer") return "#A855F7"; // purple for customer
                              if (issue.status === "in_progress") return "#3B82F6"; // blue for in progress
                              return "#F59E0B"; // amber for open
                            };
                            
                            return (
                              <Card 
                                key={issue.id} 
                                className="border-l-4" 
                                style={{ borderLeftColor: getBorderColor() }}
                              >
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Customer badge */}
                                        {issue.source === "customer" && (
                                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                            Customer Reported
                                          </span>
                                        )}
                                        {/* Roll-in Stretcher badge */}
                                        {isRollIn && (
                                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800">
                                            Roll-in
                                          </span>
                                        )}
                                        {/* Issue Code */}
                                        {issue.issue_code && (
                                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-mono">
                                            {issue.issue_code}
                                          </span>
                                        )}
                                        <Badge className={getStatusColor(issue.status)}>
                                          {issue.status.replace("_", " ")}
                                        </Badge>
                                        <Badge className={getSeverityColor(issue.severity)}>
                                          {issue.severity}
                                        </Badge>
                                        {/* SLA priority badge for powered stretchers */}
                                        {issue.source === "customer" && !isRollIn && !isResolved && (
                                          <Badge className={issue.sla_hours === 12 || !issue.sla_hours ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}>
                                            {issue.sla_hours || 12}h
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      <h4 className="font-medium mt-2">{issue.title}</h4>
                                      
                                      <p className="text-sm text-slate-500 mt-1">
                                        {issue.issue_type}
                                        {issue.warranty_status && (
                                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            issue.warranty_status === "warranty" 
                                              ? "bg-green-100 text-green-800" 
                                              : "bg-gray-100 text-gray-800"
                                          }`}>
                                            {issue.warranty_status === "warranty" ? "Warranty" : "Non Warranty"}
                                          </span>
                                        )}
                                      </p>
                                      
                                      {/* Technician Assignment with SLA Timer */}
                                      <div className="flex items-center gap-2 mt-2">
                                        <User size={14} className="text-slate-400" />
                                        {issue.technician_name ? (
                                          <span className="text-sm text-[#0066CC] font-medium">
                                            {issue.technician_name}
                                          </span>
                                        ) : (
                                          <span className="text-sm text-slate-400 italic">Unassigned</span>
                                        )}
                                        
                                        {/* SLA Timer for customer issues with technician assigned (powered only) */}
                                        {sla && (
                                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                            sla.expired ? "bg-red-500 text-white" : 
                                            sla.urgent ? "bg-orange-500 text-white" : 
                                            "bg-amber-100 text-amber-800"
                                          }`}>
                                            <Timer size={12} />
                                            {sla.text}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Contact Details Popup */}
                                      <div className="mt-2">
                                        <ContactDetailsPopup 
                                          issue={issue} 
                                          products={products}
                                        />
                                      </div>
                                      
                                      <p className="text-sm text-slate-600 mt-2">{issue.description}</p>
                                      
                                      {issue.resolution && (
                                        <div className="mt-2 p-2 bg-emerald-50 rounded text-sm text-emerald-800">
                                          <strong>Resolution:</strong> {issue.resolution}
                                        </div>
                                      )}
                                      
                                      <p className="text-xs text-slate-400 mt-2">
                                        Reported: {new Date(issue.created_at).toLocaleString()}
                                        {issue.resolved_at && ` • Resolved: ${new Date(issue.resolved_at).toLocaleString()}`}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Services Tab */}
                    <TabsContent value="services" className="mt-4">
                      {productDetails.services.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <Wrench className="mx-auto text-slate-300 mb-2" size={32} />
                          No service records for this product
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productDetails.services.map((service) => (
                            <Card key={service.id}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline" className="capitalize">{service.service_type}</Badge>
                                      <span className="text-sm text-slate-500">
                                        {new Date(service.service_date).toLocaleDateString()}
                                      </span>
                                      {service.warranty_status && (
                                        <Badge className={service.warranty_status === "warranty" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                          {service.warranty_status === "warranty" ? "Warranty" : "Non Warranty"}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2">{service.description}</p>
                                    {service.issues_found && (
                                      <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-800">
                                        <strong>Issues Found:</strong> {service.issues_found}
                                      </div>
                                    )}
                                    <p className="text-xs text-slate-400 mt-2">
                                      Technician: {service.technician_name}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {/* Maintenance Tab */}
                    <TabsContent value="maintenance" className="mt-4">
                      {productDetails.maintenance.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <CalendarIcon className="mx-auto text-slate-300 mb-2" size={32} />
                          No scheduled maintenance
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productDetails.maintenance.map((maint) => {
                            // Find linked issue to check its status
                            const linkedIssue = maint.issue_id 
                              ? productDetails.issues.find(i => i.id === maint.issue_id)
                              : null;
                            const isLinkedIssueResolved = linkedIssue?.status === "resolved";
                            const displayStatus = isLinkedIssueResolved ? "resolved" : maint.status;
                            const isPendingSchedule = maint.status === "pending_schedule";
                            
                            return (
                              <Card 
                                key={maint.id} 
                                className="border-l-4"
                                style={{ 
                                  borderLeftColor: 
                                    isLinkedIssueResolved ? "#1F2937" :
                                    maint.status === "completed" ? "#1F2937" :
                                    maint.status === "in_progress" ? "#3B82F6" :
                                    isPendingSchedule ? "#14B8A6" :
                                    maint.source === "auto_yearly" ? "#10B981" :
                                    maint.source === "customer_issue" ? "#A855F7" :
                                    maint.priority === "12h" ? "#F97316" :
                                    maint.priority === "24h" ? "#EF4444" : "#3B82F6"
                                }}
                              >
                                <CardContent className="pt-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium capitalize">{maint.maintenance_type.replace("_", " ")}</span>
                                        <Badge className={
                                          isLinkedIssueResolved ? "bg-emerald-100 text-emerald-800" :
                                          isPendingSchedule ? "bg-teal-100 text-teal-800" :
                                          getStatusColor(maint.status)
                                        }>
                                          {isLinkedIssueResolved ? "resolved" : 
                                           isPendingSchedule ? "Pending Schedule" : maint.status}
                                        </Badge>
                                        {maint.source === "auto_yearly" && (
                                          <Badge className="bg-emerald-100 text-emerald-800">Yearly</Badge>
                                        )}
                                        {maint.source === "customer_issue" && (
                                          <Badge className="bg-purple-100 text-purple-800">Customer Issue</Badge>
                                        )}
                                        {maint.source === "issue" && (
                                          <Badge className="bg-amber-100 text-amber-800">From Issue</Badge>
                                        )}
                                        {maint.priority && !isLinkedIssueResolved && !isPendingSchedule && (
                                          <Badge className={maint.priority === "12h" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}>
                                            {maint.priority}
                                          </Badge>
                                        )}
                                        {linkedIssue?.issue_code && (
                                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-xs font-mono">
                                            {linkedIssue.issue_code}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-slate-500 mt-1">
                                        {maint.scheduled_date ? (
                                          <>Scheduled: {new Date(maint.scheduled_date).toLocaleString()}</>
                                        ) : (
                                          <span className="text-amber-600">Awaiting technician scheduling</span>
                                        )}
                                      </p>
                                      {maint.notes && (
                                        <p className="text-sm text-slate-600 mt-2">{maint.notes}</p>
                                      )}
                                      {maint.technician_name && (
                                        <p className="text-xs text-slate-400 mt-2">
                                          Technician: {maint.technician_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Products;
