import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Wrench, CalendarIcon, User, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

// Beta version technician list
const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3"];

const Services = () => {
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    product_id: "",
    technician_name: "",
    service_type: "",
    description: "",
    issues_found: "",
    warranty_status: "",
  });

  // Warranty options
  const WARRANTY_OPTIONS = ["Warranty", "Non Warranty"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [servicesRes, productsRes] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/products`),
      ]);
      setServices(servicesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/services`, {
        ...formData,
        service_date: selectedDate.toISOString(),
      });
      toast.success("Service record created successfully");
      setDialogOpen(false);
      setFormData({
        product_id: "",
        technician_name: "",
        service_type: "",
        description: "",
        issues_found: "",
        warranty_status: "",
      });
      setSelectedDate(new Date());
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create service record");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service record?")) return;
    try {
      await axios.delete(`${API}/services/${id}`);
      toast.success("Service record deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete service record");
    }
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const serviceTypeColors = {
    maintenance: "bg-blue-100 text-blue-800",
    repair: "bg-amber-100 text-amber-800",
    inspection: "bg-emerald-100 text-emerald-800",
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="services-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Service Records
          </h1>
          <p className="text-slate-500 mt-1">Track maintenance and repair history</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="add-service-btn">
              <Plus size={18} className="mr-2" />
              Log Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="service-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Log Service Record</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-product">
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

              <div>
                <Label>Service Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal"
                      data-testid="select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
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
                <Label htmlFor="technician_name">Technician Name *</Label>
                <Select
                  value={formData.technician_name}
                  onValueChange={(value) => setFormData({ ...formData, technician_name: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-technician">
                    <SelectValue placeholder="Select technician" />
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
                <Label>Service Type *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-service-type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Warranty Status *</Label>
                <Select
                  value={formData.warranty_status}
                  onValueChange={(value) => setFormData({ ...formData, warranty_status: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-warranty">
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
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the service performed..."
                  required
                  data-testid="input-description"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="issues_found">Issues Found (Optional)</Label>
                <Textarea
                  id="issues_found"
                  value={formData.issues_found}
                  onChange={(e) => setFormData({ ...formData, issues_found: e.target.value })}
                  placeholder="Note any issues discovered during service..."
                  data-testid="input-issues-found"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0066CC] hover:bg-[#0052A3]"
                  disabled={!formData.product_id || !formData.technician_name || !formData.service_type || !formData.description}
                  data-testid="submit-service-btn"
                >
                  Save Record
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Services List */}
      <div className="space-y-4" data-testid="services-list">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">Loading...</CardContent>
          </Card>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">No service records yet</p>
              <p className="text-sm text-slate-400 mt-1">Log your first service to get started</p>
            </CardContent>
          </Card>
        ) : (
          services.map((service) => (
            <Card key={service.id} className="card-hover" data-testid={`service-card-${service.id}`}>
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
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
                    <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <User size={14} />
                        {service.technician_name}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`delete-service-${service.id}`}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Services;
