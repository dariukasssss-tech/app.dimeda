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
  Eye, AlertTriangle, Wrench, Clock, CheckCircle, XCircle, ChevronRight
} from "lucide-react";
import { format, addYears } from "date-fns";

const CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];
const MODEL_OPTIONS = ["Powered Stretchers", "Roll-in stretchers"];

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
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
        toast.success("Product updated! Yearly maintenance recalculated.");
      } else {
        await axios.post(`${API}/products`, payload);
        toast.success("Product registered! Annual maintenance scheduled for 5 years.");
      }
      setDialogOpen(false);
      setEditProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save product");
    }
  };

  const resetForm = () => {
    setFormData({ serial_number: "", model_name: "", city: "", location_detail: "", notes: "" });
    setSelectedDate(new Date());
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setFormData({
      serial_number: product.serial_number,
      model_name: product.model_name,
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
    if (!window.confirm("Are you sure you want to delete this product? This will also delete all scheduled maintenance for this unit.")) return;
    try {
      await axios.delete(`${API}/products/${id}`);
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location_detail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === "all" || p.city === cityFilter;
    return matchesSearch && matchesCity;
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
            Products
          </h1>
          <p className="text-slate-500 mt-1">Manage registered stretchers ({products.length} total)</p>
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
              Register Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="product-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                {editProduct ? "Edit Product" : "Register New Product"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="serial_number">Serial Number *</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Enter serial number"
                  required
                  data-testid="input-serial-number"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="model_name">Model *</Label>
                <Select
                  value={formData.model_name}
                  onValueChange={(value) => setFormData({ ...formData, model_name: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-model-name">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-city">
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
              
              <div>
                <Label>Registration Date *</Label>
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
                <Label htmlFor="location_detail">Location Detail</Label>
                <Input
                  id="location_detail"
                  value={formData.location_detail}
                  onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
                  placeholder="e.g., Hospital ABC, Ward 3"
                  data-testid="input-location-detail"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                  data-testid="input-notes"
                  className="mt-1"
                />
              </div>
              
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-medium text-emerald-800 mb-2">
                  <CalendarIcon size={14} className="inline mr-1" />
                  Yearly Maintenance Schedule:
                </p>
                <div className="grid grid-cols-2 gap-1 text-xs text-emerald-700">
                  {getMaintenanceDates().map((date, idx) => (
                    <div key={idx}>Year {idx + 1}: {date}</div>
                  ))}
                </div>
                {editProduct && (
                  <p className="text-xs text-emerald-600 mt-2 italic">
                    * Changing the date will recalculate all yearly maintenance
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#0066CC] hover:bg-[#0052A3]" 
                  data-testid="submit-product-btn"
                  disabled={!formData.serial_number || !formData.city || !formData.model_name}
                >
                  {editProduct ? "Update" : "Register"}
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
                  <Tabs defaultValue="issues" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="issues" className="flex items-center gap-1">
                        <AlertTriangle size={14} />
                        Issues ({productDetails.issues.length})
                      </TabsTrigger>
                      <TabsTrigger value="services" className="flex items-center gap-1">
                        <Wrench size={14} />
                        Services ({productDetails.services.length})
                      </TabsTrigger>
                      <TabsTrigger value="maintenance" className="flex items-center gap-1">
                        <CalendarIcon size={14} />
                        Maintenance ({productDetails.maintenance.length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Issues Tab */}
                    <TabsContent value="issues" className="mt-4">
                      {productDetails.issues.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <AlertTriangle className="mx-auto text-slate-300 mb-2" size={32} />
                          No issues reported for this product
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productDetails.issues.map((issue) => (
                            <Card key={issue.id} className="border-l-4" style={{ borderLeftColor: issue.status === "resolved" ? "#10B981" : issue.status === "in_progress" ? "#3B82F6" : "#F59E0B" }}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium">{issue.title}</h4>
                                      <Badge className={getStatusColor(issue.status)}>
                                        {issue.status.replace("_", " ")}
                                      </Badge>
                                      <Badge className={getSeverityColor(issue.severity)}>
                                        {issue.severity}
                                      </Badge>
                                      {issue.warranty_status && (
                                        <Badge className={issue.warranty_status === "warranty" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                          {issue.warranty_status === "warranty" ? "Warranty" : "Non Warranty"}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                      {issue.issue_type}
                                      {issue.technician_name && <span className="ml-2 text-[#0066CC]">• {issue.technician_name}</span>}
                                    </p>
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
                          ))}
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
                          {productDetails.maintenance.map((maint) => (
                            <Card 
                              key={maint.id} 
                              className="border-l-4"
                              style={{ 
                                borderLeftColor: 
                                  maint.status === "completed" ? "#1F2937" :
                                  maint.status === "in_progress" ? "#3B82F6" :
                                  maint.source === "auto_yearly" ? "#10B981" :
                                  maint.priority === "12h" ? "#F97316" :
                                  maint.priority === "24h" ? "#EF4444" : "#3B82F6"
                              }}
                            >
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium capitalize">{maint.maintenance_type.replace("_", " ")}</span>
                                      <Badge className={getStatusColor(maint.status)}>
                                        {maint.status}
                                      </Badge>
                                      {maint.source === "auto_yearly" && (
                                        <Badge className="bg-emerald-100 text-emerald-800">Yearly</Badge>
                                      )}
                                      {maint.source === "issue" && (
                                        <Badge className="bg-amber-100 text-amber-800">From Issue</Badge>
                                      )}
                                      {maint.priority && (
                                        <Badge className={maint.priority === "12h" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"}>
                                          {maint.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                      Scheduled: {new Date(maint.scheduled_date).toLocaleString()}
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
                          ))}
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
