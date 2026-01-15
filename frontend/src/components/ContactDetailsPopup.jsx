import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Phone, Mail, User, Building2, MapPin, Users } from "lucide-react";

/**
 * Contact Details Popup Component
 * Shows customer contact information for an issue based on product's city
 */
const ContactDetailsPopup = ({ issue, products, trigger }) => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Get product info
  const product = products?.find(p => p.id === issue?.product_id);
  const city = product?.city;

  // Fetch customers when dialog opens
  useEffect(() => {
    if (open && city) {
      fetchCustomers();
    }
  }, [open, city]);

  const fetchCustomers = async () => {
    if (!city) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API}/customers/by-city/${encodeURIComponent(city)}`);
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="text-[#0066CC] border-[#0066CC] hover:bg-blue-50"
            data-testid={`contact-details-btn-${issue?.id}`}
          >
            <Users size={14} className="mr-1" />
            {t("contacts.contactDetails") || "Contact Details"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="contact-details-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <Users size={20} className="text-[#0066CC]" />
            {t("contacts.contactDetails") || "Contact Details"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {/* Issue & Product Info */}
          <div className="p-3 bg-slate-50 rounded-lg mb-4">
            <p className="text-sm font-medium text-slate-700">{issue?.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <MapPin size={12} />
              <span>{city || t("common.noData")}</span>
              {product && (
                <>
                  <span>•</span>
                  <span>S/N: {product.serial_number}</span>
                </>
              )}
            </div>
          </div>

          {/* Customers List */}
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              {t("common.loading")}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto text-slate-300" size={40} />
              <p className="text-slate-500 mt-3">
                {t("contacts.noContactsInCity") || "No contacts found in"} {city}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {t("contacts.addCustomerFirst") || "Add a customer for this city first"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => (
                <div 
                  key={customer.id} 
                  className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  data-testid={`contact-card-${customer.id}`}
                >
                  {/* Customer Name */}
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={16} className="text-[#0066CC]" />
                    <span className="font-medium text-slate-900">{customer.name}</span>
                  </div>
                  
                  {/* Contact Person */}
                  {customer.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                      <User size={14} className="text-slate-400" />
                      <span>{customer.contact_person}</span>
                    </div>
                  )}
                  
                  {/* Phone */}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Phone size={14} className="text-slate-400" />
                      <a 
                        href={`tel:${customer.phone}`} 
                        className="text-[#0066CC] hover:underline"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  
                  {/* Email */}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-slate-400" />
                      <a 
                        href={`mailto:${customer.email}`} 
                        className="text-[#0066CC] hover:underline"
                      >
                        {customer.email}
                      </a>
                    </div>
                  )}
                  
                  {/* Address */}
                  {customer.address && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                      <MapPin size={12} />
                      <span>{customer.address}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDetailsPopup;
