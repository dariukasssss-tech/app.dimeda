import { useState, useEffect } from "react";
import axios from "axios";
import { API, getAuthToken } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Package, Wrench, AlertTriangle, FileText, CalendarIcon, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Export = () => {
  const [loading, setLoading] = useState({});
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reportDate, setReportDate] = useState(new Date());
  const [productData, setProductData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterSurname, setReporterSurname] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error("Failed to fetch products");
    }
  };

  const fetchProductData = async (productId) => {
    setReportLoading(true);
    try {
      const [productRes, issuesRes, servicesRes, maintenanceRes] = await Promise.all([
        axios.get(`${API}/products/${productId}`),
        axios.get(`${API}/issues?product_id=${productId}`),
        axios.get(`${API}/services?product_id=${productId}`),
        axios.get(`${API}/scheduled-maintenance?product_id=${productId}`),
      ]);
      setProductData({
        product: productRes.data,
        issues: issuesRes.data,
        services: servicesRes.data,
        maintenance: maintenanceRes.data,
      });
    } catch (error) {
      toast.error("Failed to fetch product data");
    } finally {
      setReportLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedProduct(productId);
    if (productId) {
      fetchProductData(productId);
    } else {
      setProductData(null);
    }
  };

  const handleExport = async (dataType) => {
    setLoading((prev) => ({ ...prev, [dataType]: true }));
    try {
      const token = getAuthToken();
      const response = await fetch(`${API}/export/csv?data_type=${dataType}`, {
        credentials: 'include',
        headers: {
          'X-Auth-Token': token || ''
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataType}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`${dataType.charAt(0).toUpperCase() + dataType.slice(1)} exported successfully`);
    } catch (error) {
      toast.error(error.message || "Export failed");
    } finally {
      setLoading((prev) => ({ ...prev, [dataType]: false }));
    }
  };

  const getDeviceSuitability = () => {
    if (!productData) return { suitable: true, reason: "" };
    
    const openIssues = productData.issues.filter(i => i.status !== "resolved");
    const criticalOrHighIssues = openIssues.filter(i => 
      i.severity === "critical" || i.severity === "high"
    );
    
    if (criticalOrHighIssues.length > 0) {
      return {
        suitable: false,
        reason: `${criticalOrHighIssues.length} unresolved high/critical issue(s)`,
        issues: criticalOrHighIssues
      };
    }
    
    return {
      suitable: true,
      reason: openIssues.length > 0 
        ? `${openIssues.length} minor issue(s) (low/medium severity)`
        : "All issues resolved or no issues reported"
    };
  };

  const generatePDF = () => {
    if (!productData || !reporterName || !reporterSurname) {
      toast.error("Please fill in all required fields");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = 20;

    // Add logo (left corner)
    // Since we can't load external images easily in jsPDF, we'll add text logo
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204);
    doc.setFont("helvetica", "bold");
    doc.text("DIMEDA", margin, yPos);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Service Pro", margin, yPos + 5);

    // Title
    yPos = 40;
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Device Inspection Report", pageWidth / 2, yPos, { align: "center" });

    // Report Date
    yPos += 15;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Date: ${format(reportDate, "MMMM d, yyyy")}`, pageWidth / 2, yPos, { align: "center" });

    // Product Information
    yPos += 20;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Product Information", margin, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const productInfo = [
      ["Serial Number:", productData.product.serial_number],
      ["Model:", productData.product.model_name],
      ["City:", productData.product.city],
      ["Location:", productData.product.location_detail || "-"],
      ["Registration Date:", format(new Date(productData.product.registration_date), "MMMM d, yyyy")],
      ["Status:", productData.product.status],
    ];

    productInfo.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 45, yPos);
      yPos += 7;
    });

    // Issues Summary
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Issues Summary", margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const openIssues = productData.issues.filter(i => i.status !== "resolved");
    const resolvedIssues = productData.issues.filter(i => i.status === "resolved");

    doc.setFont("helvetica", "normal");
    doc.text(`Total Issues: ${productData.issues.length}`, margin, yPos);
    yPos += 6;
    doc.text(`Open Issues: ${openIssues.length}`, margin, yPos);
    yPos += 6;
    doc.text(`Resolved Issues: ${resolvedIssues.length}`, margin, yPos);

    // Issues Table
    if (productData.issues.length > 0) {
      yPos += 10;
      
      const issueRows = productData.issues.map(issue => [
        issue.title,
        issue.issue_type,
        issue.severity,
        issue.status,
        format(new Date(issue.created_at), "MM/dd/yyyy")
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Title", "Type", "Severity", "Status", "Date"]],
        body: issueRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 102, 204] },
      });

      yPos = doc.lastAutoTable.finalY + 15;
    } else {
      yPos += 15;
    }

    // Service History
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Service History", margin, yPos);

    yPos += 10;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Service Records: ${productData.services.length}`, margin, yPos);

    if (productData.services.length > 0) {
      yPos += 10;
      
      const serviceRows = productData.services.slice(0, 5).map(service => [
        service.service_type,
        service.technician_name,
        format(new Date(service.service_date), "MM/dd/yyyy"),
        service.description.substring(0, 40) + (service.description.length > 40 ? "..." : "")
      ]);

      doc.autoTable({
        startY: yPos,
        head: [["Type", "Technician", "Date", "Description"]],
        body: serviceRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
        headStyles: { fillColor: [0, 102, 204] },
      });

      yPos = doc.lastAutoTable.finalY + 15;
    } else {
      yPos += 15;
    }

    // Device Suitability - CONCLUSION
    const suitability = getDeviceSuitability();
    
    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Conclusion", margin, yPos);

    yPos += 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    
    if (suitability.suitable) {
      doc.setTextColor(0, 128, 0); // Green
      doc.text("Device is suitable for use", margin, yPos);
    } else {
      doc.setTextColor(255, 0, 0); // Red
      doc.text("Device is NOT suitable for use", margin, yPos);
    }

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Reason: ${suitability.reason}`, margin, yPos);

    // Signature Section at the bottom
    const signatureY = pageHeight - 40;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, signatureY - 10, pageWidth - margin, signatureY - 10);

    // Name and Surname (left side)
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Name:", margin, signatureY);
    doc.setFont("helvetica", "bold");
    doc.text(`${reporterName} ${reporterSurname}`, margin + 15, signatureY);

    doc.setFont("helvetica", "normal");
    doc.text("Date:", margin, signatureY + 8);
    doc.text(format(reportDate, "MM/dd/yyyy"), margin + 15, signatureY + 8);

    // Signature (right side)
    doc.text("Signature:", pageWidth - margin - 60, signatureY);
    doc.line(pageWidth - margin - 45, signatureY + 2, pageWidth - margin, signatureY + 2);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Dimeda Service Pro - Medirol Vivera Monobloc", pageWidth / 2, pageHeight - 10, { align: "center" });

    // Save PDF
    doc.save(`Device_Report_${productData.product.serial_number}_${format(reportDate, "yyyyMMdd")}.pdf`);
    toast.success("PDF report generated successfully");
  };

  const exportOptions = [
    {
      id: "products",
      title: "Products",
      description: "Export all registered stretchers with serial numbers, locations, and registration dates.",
      icon: Package,
      color: "bg-[#0066CC]",
    },
    {
      id: "services",
      title: "Service Records",
      description: "Export complete service history including technician names, service types, and descriptions.",
      icon: Wrench,
      color: "bg-slate-700",
    },
    {
      id: "issues",
      title: "Issues",
      description: "Export all reported issues with status, severity, and resolution notes.",
      icon: AlertTriangle,
      color: "bg-[#FA4616]",
    },
  ];

  const suitability = productData ? getDeviceSuitability() : null;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="export-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Export Data
        </h1>
        <p className="text-slate-500 mt-1">Download your data as CSV files or generate PDF reports</p>
      </div>

      {/* Export Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {exportOptions.map((option) => (
          <Card key={option.id} className="card-hover" data-testid={`export-card-${option.id}`}>
            <CardHeader>
              <div className={`w-12 h-12 ${option.color} rounded-xl flex items-center justify-center mb-4`}>
                <option.icon className="text-white" size={24} />
              </div>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>{option.title}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleExport(option.id)}
                disabled={loading[option.id]}
                className="w-full bg-slate-900 hover:bg-slate-800"
                data-testid={`export-btn-${option.id}`}
              >
                {loading[option.id] ? (
                  "Exporting..."
                ) : (
                  <>
                    <Download size={18} className="mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PDF Report Form */}
      <Card className="border-2 border-[#0066CC]" data-testid="report-form-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#0066CC] rounded-xl flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Device Inspection Report</CardTitle>
              <CardDescription>Generate a PDF report for a specific product</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              <div>
                <Label>Select Product *</Label>
                <Select value={selectedProduct || ""} onValueChange={handleProductSelect}>
                  <SelectTrigger className="mt-1" data-testid="report-select-product">
                    <SelectValue placeholder="Choose a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.serial_number} - {product.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Report Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal"
                      data-testid="report-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(reportDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={reportDate}
                      onSelect={(date) => date && setReportDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reporterName">Name *</Label>
                  <Input
                    id="reporterName"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="First name"
                    data-testid="report-input-name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reporterSurname">Surname *</Label>
                  <Input
                    id="reporterSurname"
                    value={reporterSurname}
                    onChange={(e) => setReporterSurname(e.target.value)}
                    placeholder="Last name"
                    data-testid="report-input-surname"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={generatePDF}
                disabled={!selectedProduct || !reporterName || !reporterSurname || reportLoading}
                className="w-full bg-[#0066CC] hover:bg-[#0052A3]"
                data-testid="generate-pdf-btn"
              >
                <FileText size={18} className="mr-2" />
                Generate PDF Report
              </Button>
            </div>

            {/* Right Column - Preview */}
            <div>
              {reportLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Loading product data...
                </div>
              ) : productData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 mb-2">Product Summary</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-slate-500">S/N:</span> {productData.product.serial_number}</p>
                      <p><span className="text-slate-500">Model:</span> {productData.product.model_name}</p>
                      <p><span className="text-slate-500">City:</span> {productData.product.city}</p>
                      <p><span className="text-slate-500">Issues:</span> {productData.issues.length} total ({productData.issues.filter(i => i.status !== "resolved").length} open)</p>
                      <p><span className="text-slate-500">Services:</span> {productData.services.length} records</p>
                    </div>
                  </div>

                  {/* Suitability Indicator */}
                  <div className={`p-4 rounded-lg border-2 ${suitability.suitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {suitability.suitable ? (
                        <CheckCircle className="text-emerald-600" size={24} />
                      ) : (
                        <XCircle className="text-red-600" size={24} />
                      )}
                      <div>
                        <p className={`font-bold ${suitability.suitable ? 'text-emerald-700' : 'text-red-700'}`}>
                          {suitability.suitable ? "Device is suitable for use" : "Device is NOT suitable for use"}
                        </p>
                        <p className={`text-sm ${suitability.suitable ? 'text-emerald-600' : 'text-red-600'}`}>
                          {suitability.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-center p-8">
                  <div>
                    <Package className="mx-auto mb-2" size={32} />
                    <p>Select a product to see the report preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
