import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Wrench, CalendarIcon, User, Clock, CheckCircle, AlertTriangle } from "lucide-react";

const TechnicianServices = ({ selectedTechnician }) => {
  const [services, setServices] = useState([]);
  const [issues, setIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

      {/* In Progress Issues */}
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
              No issues in progress
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${issue.source === "customer" ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"}`}
                >
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
    </div>
  );
};

export default TechnicianServices;
