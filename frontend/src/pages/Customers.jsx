import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, Users, MapPin, Phone, Mail, User, Trash2, Edit, Building2 } from "lucide-react";

const CITIES = ["Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Panevėžys"];

const Customers = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    address: "",
    contact_person: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      city: "",
      address: "",
      contact_person: "",
      phone: "",
      email: "",
    });
    setEditCustomer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editCustomer) {
        await axios.put(`${API}/customers/${editCustomer.id}`, formData);
        toast.success(t("customers.customerUpdated") || "Customer updated successfully");
      } else {
        await axios.post(`${API}/customers`, formData);
        toast.success(t("customers.customerCreated") || "Customer added successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("common.error"));
    }
  };

  const handleEdit = (customer) => {
    setEditCustomer(customer);
    setFormData({
      name: customer.name,
      city: customer.city,
      address: customer.address || "",
      contact_person: customer.contact_person || "",
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("messages.confirmDelete"))) return;
    try {
      await axios.delete(`${API}/customers/${id}`);
      toast.success(t("customers.customerDeleted") || "Customer deleted");
      fetchCustomers();
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  // Filter customers by search and city
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === "all" || customer.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  // Group customers by city for display
  const customersByCity = CITIES.reduce((acc, city) => {
    acc[city] = customers.filter(c => c.city === city).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t("customers.title") || "Customers"}
          </h1>
          <p className="text-slate-500 mt-1">
            {t("customers.manageCustomers") || "Manage customer information by city"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="add-customer-btn">
              <Plus size={18} className="mr-2" />
              {t("customers.addCustomer") || "Add Customer"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="customer-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>
                {editCustomer 
                  ? (t("customers.editCustomer") || "Edit Customer")
                  : (t("customers.addCustomer") || "Add Customer")
                }
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">{t("customers.name") || "Name"} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("customers.companyName") || "Company or institution name"}
                  required
                  className="mt-1"
                  data-testid="input-customer-name"
                />
              </div>
              
              <div>
                <Label>{t("products.city") || "City"} *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) => setFormData({ ...formData, city: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="select-customer-city">
                    <SelectValue placeholder={t("products.city") || "Select city"} />
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
                <Label htmlFor="address">{t("customers.address") || "Address"}</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t("customers.fullAddress") || "Full address"}
                  className="mt-1"
                  data-testid="input-customer-address"
                />
              </div>

              <div>
                <Label htmlFor="contact_person">{t("customers.contactPerson") || "Contact Person"}</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder={t("customers.contactPersonName") || "Contact person name"}
                  className="mt-1"
                  data-testid="input-contact-person"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">{t("customers.phone") || "Phone"}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+370..."
                    className="mt-1"
                    data-testid="input-customer-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t("customers.email") || "Email"}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    className="mt-1"
                    data-testid="input-customer-email"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#0066CC] hover:bg-[#0052A3]"
                  disabled={!formData.name || !formData.city}
                  data-testid="submit-customer-btn"
                >
                  {editCustomer ? t("common.save") : (t("customers.addCustomer") || "Add Customer")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats by City */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {CITIES.map((city) => (
          <Card 
            key={city} 
            className={`cursor-pointer transition-all ${cityFilter === city ? 'ring-2 ring-[#0066CC]' : 'hover:shadow-md'}`}
            onClick={() => setCityFilter(cityFilter === city ? "all" : city)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{city}</p>
                  <p className="text-xl font-bold text-slate-900">{customersByCity[city] || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder={t("common.search") || "Search customers..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-customers"
              />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-48" data-testid="filter-city">
                <SelectValue placeholder={t("common.allCities") || "All Cities"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allCities") || "All Cities"}</SelectItem>
                {CITIES.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Users size={20} />
            {t("customers.title") || "Customers"} ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">{t("common.loading")}</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">{t("customers.noCustomers") || "No customers found"}</p>
              <p className="text-sm text-slate-400 mt-1">
                {t("customers.addFirstCustomer") || "Add your first customer to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("customers.name") || "Name"}</TableHead>
                    <TableHead>{t("products.city") || "City"}</TableHead>
                    <TableHead>{t("customers.contactPerson") || "Contact"}</TableHead>
                    <TableHead>{t("customers.phone") || "Phone"}</TableHead>
                    <TableHead>{t("customers.email") || "Email"}</TableHead>
                    <TableHead className="text-right">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          {customer.address && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} />
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-slate-100 rounded text-sm font-medium">
                          {customer.city}
                        </span>
                      </TableCell>
                      <TableCell>
                        {customer.contact_person ? (
                          <span className="flex items-center gap-1 text-sm">
                            <User size={14} className="text-slate-400" />
                            {customer.contact_person}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-sm text-[#0066CC] hover:underline">
                            <Phone size={14} />
                            {customer.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-sm text-[#0066CC] hover:underline">
                            <Mail size={14} />
                            {customer.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                            data-testid={`edit-customer-${customer.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-customer-${customer.id}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
