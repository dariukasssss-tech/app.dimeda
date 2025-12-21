import { useState, useEffect } from "react";
import axios from "axios";
import { API, getAuthToken } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Download, FileSpreadsheet, Package, Wrench, AlertTriangle, FileText, CalendarIcon, CheckCircle, XCircle, Eye, Settings } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Inspection checklist questions
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

const Export = () => {
  const [loading, setLoading] = useState({});
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reportDate, setReportDate] = useState(new Date());
  const [productData, setProductData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reporterName, setReporterName] = useState("");
  const [reporterSurname, setReporterSurname] = useState("");
  
  // Inspection checklists - all default to true (Yes)
  const [visualChecks, setVisualChecks] = useState(
    VISUAL_INSPECTION.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {})
  );
  const [functionalityChecks, setFunctionalityChecks] = useState(
    FUNCTIONALITY_INSPECTION.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {})
  );

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

  // Parse inspection items from "Other" type issue descriptions
  const parseInspectionItemsFromIssues = (issues) => {
    const failedVisualItems = new Set();
    const failedFunctionalityItems = new Set();
    
    // Filter for "other" type issues
    const otherIssues = issues.filter(issue => issue.issue_type === "other");
    
    otherIssues.forEach(issue => {
      const description = issue.description || "";
      
      // Parse Visual Inspection Issues
      const visualMatch = description.match(/Visual Inspection Issues:\n([\s\S]*?)(?=\n\nFunctionality|$|\n\nAdditional)/);
      if (visualMatch) {
        const items = visualMatch[1].split("\n- ").filter(item => item.trim());
        items.forEach(item => {
          // Find matching item in VISUAL_INSPECTION
          VISUAL_INSPECTION.forEach((checkItem, idx) => {
            if (item.trim() === checkItem || item.trim().startsWith(checkItem.substring(0, 20))) {
              failedVisualItems.add(idx);
            }
          });
        });
      }
      
      // Parse Functionality Inspection Issues
      const functionalityMatch = description.match(/Functionality Inspection Issues:\n([\s\S]*?)(?=\n\nAdditional|$)/);
      if (functionalityMatch) {
        const items = functionalityMatch[1].split("\n- ").filter(item => item.trim());
        items.forEach(item => {
          // Find matching item in FUNCTIONALITY_INSPECTION
          FUNCTIONALITY_INSPECTION.forEach((checkItem, idx) => {
            if (item.trim() === checkItem || item.trim().startsWith(checkItem.substring(0, 20))) {
              failedFunctionalityItems.add(idx);
            }
          });
        });
      }
    });
    
    return { failedVisualItems, failedFunctionalityItems };
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
      
      const issues = issuesRes.data;
      
      // Parse and apply inspection failures from "Other" type issues
      const { failedVisualItems, failedFunctionalityItems } = parseInspectionItemsFromIssues(issues);
      
      // Reset all checks to true first
      const newVisualChecks = VISUAL_INSPECTION.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {});
      const newFunctionalityChecks = FUNCTIONALITY_INSPECTION.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {});
      
      // Unmark (set to false) the failed items from "Other" type issues
      failedVisualItems.forEach(idx => {
        newVisualChecks[idx] = false;
      });
      failedFunctionalityItems.forEach(idx => {
        newFunctionalityChecks[idx] = false;
      });
      
      setVisualChecks(newVisualChecks);
      setFunctionalityChecks(newFunctionalityChecks);
      
      setProductData({
        product: productRes.data,
        issues: issues,
        services: servicesRes.data,
        maintenance: maintenanceRes.data,
      });
      
      // Show notification if any items were auto-unmarked
      if (failedVisualItems.size > 0 || failedFunctionalityItems.size > 0) {
        toast.info(`${failedVisualItems.size + failedFunctionalityItems.size} inspection item(s) unmarked based on "Other" type issues`);
      }
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
      // Reset all checks to default (true) when no product selected
      setVisualChecks(VISUAL_INSPECTION.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {}));
      setFunctionalityChecks(FUNCTIONALITY_INSPECTION.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {}));
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

  const generatePDF = async () => {
    if (!productData || !reporterName || !reporterSurname) {
      toast.error("Please fill in all required fields");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 15;

    // Load and add logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = "https://customer-assets.emergentagent.com/job_842f69d6-21b8-4f70-96b2-758e2fcffc47/artifacts/ey8xv2jb_Dimeda_logo-01.jpg";
      });
      doc.addImage(logoImg, "JPEG", margin, yPos, 35, 12);
    } catch (e) {
      doc.setFontSize(14);
      doc.setTextColor(0, 102, 204);
      doc.setFont("helvetica", "bold");
      doc.text("DIMEDA", margin, yPos + 8);
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Device Inspection Report", pageWidth - margin, yPos + 6, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Date: ${format(reportDate, "MMMM d, yyyy")}`, pageWidth - margin, yPos + 12, { align: "right" });

    yPos = 35;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Two column layout: Product Info (left) | Conclusion (right)
    const colWidth = (pageWidth - margin * 3) / 2;
    
    // LEFT COLUMN - Product Information
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Product Information", margin, yPos);
    
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const productInfo = [
      ["Serial Number:", productData.product.serial_number],
      ["Model:", productData.product.model_name],
      ["City:", productData.product.city],
      ["Location:", productData.product.location_detail || "-"],
      ["Registration:", format(new Date(productData.product.registration_date), "MMM d, yyyy")],
    ];

    let leftY = yPos;
    productInfo.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, leftY);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), margin + 25, leftY);
      leftY += 4;
    });

    // RIGHT COLUMN - Conclusion
    const rightColX = margin + colWidth + margin;
    const suitability = getDeviceSuitability();
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Conclusion", rightColX, yPos);
    
    let rightY = yPos + 6;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    
    if (suitability.suitable) {
      doc.setTextColor(0, 128, 0);
      doc.text("Device is suitable for use", rightColX, rightY);
    } else {
      doc.setTextColor(255, 0, 0);
      doc.text("Device is NOT suitable for use", rightColX, rightY);
    }

    rightY += 5;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(suitability.reason, rightColX, rightY);

    yPos = Math.max(leftY, rightY) + 4;

    // Horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;

    // INSPECTION CHECKLISTS
    // Visual Inspection
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Visual Inspection", margin, yPos);
    yPos += 3;

    const visualRows = VISUAL_INSPECTION.map((question, idx) => [
      question,
      visualChecks[idx] ? "Yes" : "No"
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Check Item", "Status"]],
      body: visualRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { cellWidth: 20, halign: 'center' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'No') {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [0, 128, 0];
          }
        }
      }
    });

    yPos = doc.lastAutoTable.finalY + 4;

    // Functionality Inspection
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Functionality Inspection", margin, yPos);
    yPos += 3;

    const functionalityRows = FUNCTIONALITY_INSPECTION.map((question, idx) => [
      question,
      functionalityChecks[idx] ? "Yes" : "No"
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Check Item", "Status"]],
      body: functionalityRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 7, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 150 },
        1: { cellWidth: 20, halign: 'center' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'No') {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [0, 128, 0];
          }
        }
      }
    });

    yPos = doc.lastAutoTable.finalY + 4;

    // Issues Table (moved after Functionality Inspection)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Issues", margin, yPos);
    yPos += 3;

    if (productData.issues.length > 0) {
      const issueRows = productData.issues.slice(0, 5).map(issue => [
        issue.title.substring(0, 20) + (issue.title.length > 20 ? "..." : ""),
        issue.issue_type,
        issue.severity,
        issue.status,
        format(new Date(issue.created_at), "MM/dd/yy")
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Title", "Type", "Severity", "Status", "Date"]],
        body: issueRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 7, fontStyle: 'bold' },
      });

      yPos = doc.lastAutoTable.finalY + 4;
    } else {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("No issues reported", margin, yPos + 3);
      yPos += 6;
    }

    // Services Table
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 102, 204);
    doc.text("Service Records", margin, yPos);
    yPos += 3;

    if (productData.services.length > 0) {
      const serviceRows = productData.services.slice(0, 4).map(service => [
        service.service_type,
        service.technician_name,
        format(new Date(service.service_date), "MM/dd/yy"),
        service.description.substring(0, 30) + (service.description.length > 30 ? "..." : "")
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Type", "Technician", "Date", "Description"]],
        body: serviceRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 7, fontStyle: 'bold' },
      });

      yPos = doc.lastAutoTable.finalY + 4;
    } else {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("No service records", margin, yPos + 3);
      yPos += 6;
    }

    // Signature Section
    const signatureY = pageHeight - 20;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, signatureY - 6, pageWidth - margin, signatureY - 6);

    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("Name:", margin, signatureY);
    doc.setFont("helvetica", "bold");
    doc.text(`${reporterName} ${reporterSurname}`, margin + 12, signatureY);

    doc.setFont("helvetica", "normal");
    doc.text("Date:", margin, signatureY + 5);
    doc.text(format(reportDate, "MM/dd/yyyy"), margin + 12, signatureY + 5);

    doc.text("Signature:", pageWidth - margin - 45, signatureY);
    doc.line(pageWidth - margin - 32, signatureY + 2, pageWidth - margin, signatureY + 2);

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

  // Count failed checks
  const visualFailCount = Object.values(visualChecks).filter(v => !v).length;
  const functionalityFailCount = Object.values(functionalityChecks).filter(v => !v).length;

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
          {/* Basic Info Row */}
          <div className="grid md:grid-cols-4 gap-4">
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
                    {format(reportDate, "MMM d, yyyy")}
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

          {/* Inspection Checklists */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Visual Inspection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="text-[#0066CC]" size={18} />
                <h3 className="font-semibold text-slate-900">Visual Inspection</h3>
                {visualFailCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {visualFailCount} failed
                  </span>
                )}
              </div>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
                {VISUAL_INSPECTION.map((question, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Checkbox
                      id={`visual-${idx}`}
                      checked={visualChecks[idx]}
                      onCheckedChange={(checked) => 
                        setVisualChecks(prev => ({ ...prev, [idx]: checked }))
                      }
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor={`visual-${idx}`} 
                      className={`text-sm cursor-pointer ${!visualChecks[idx] ? 'text-red-600 font-medium' : 'text-slate-700'}`}
                    >
                      {question}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Functionality Inspection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="text-[#0066CC]" size={18} />
                <h3 className="font-semibold text-slate-900">Functionality Inspection</h3>
                {functionalityFailCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {functionalityFailCount} failed
                  </span>
                )}
              </div>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg max-h-[300px] overflow-y-auto">
                {FUNCTIONALITY_INSPECTION.map((question, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Checkbox
                      id={`functionality-${idx}`}
                      checked={functionalityChecks[idx]}
                      onCheckedChange={(checked) => 
                        setFunctionalityChecks(prev => ({ ...prev, [idx]: checked }))
                      }
                      className="mt-0.5"
                    />
                    <label 
                      htmlFor={`functionality-${idx}`} 
                      className={`text-sm cursor-pointer ${!functionalityChecks[idx] ? 'text-red-600 font-medium' : 'text-slate-700'}`}
                    >
                      {question}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview and Generate */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Product Preview */}
            <div>
              {reportLoading ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Loading product data...
                </div>
              ) : productData ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <h4 className="font-semibold text-slate-900 text-sm mb-2">Product Summary</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-slate-500">S/N:</span> {productData.product.serial_number}</p>
                      <p><span className="text-slate-500">Model:</span> {productData.product.model_name}</p>
                      <p><span className="text-slate-500">City:</span> {productData.product.city}</p>
                      <p><span className="text-slate-500">Issues:</span> {productData.issues.length} total</p>
                      <p><span className="text-slate-500">Services:</span> {productData.services.length} records</p>
                    </div>
                  </div>

                  {/* Suitability Indicator */}
                  <div className={`p-3 rounded-lg border-2 ${suitability.suitable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {suitability.suitable ? (
                        <CheckCircle className="text-emerald-600" size={20} />
                      ) : (
                        <XCircle className="text-red-600" size={20} />
                      )}
                      <div>
                        <p className={`font-bold text-sm ${suitability.suitable ? 'text-emerald-700' : 'text-red-700'}`}>
                          {suitability.suitable ? "Device is suitable for use" : "Device is NOT suitable for use"}
                        </p>
                        <p className={`text-xs ${suitability.suitable ? 'text-emerald-600' : 'text-red-600'}`}>
                          {suitability.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-center p-4">
                  <div>
                    <Package className="mx-auto mb-2" size={28} />
                    <p className="text-sm">Select a product to see preview</p>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <Button
                onClick={generatePDF}
                disabled={!selectedProduct || !reporterName || !reporterSurname || reportLoading}
                className="w-full bg-[#0066CC] hover:bg-[#0052A3] h-12"
                data-testid="generate-pdf-btn"
              >
                <FileText size={18} className="mr-2" />
                Generate PDF Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
