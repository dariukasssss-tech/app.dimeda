import { useState } from "react";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Package, Wrench, AlertTriangle } from "lucide-react";

const Export = () => {
  const [loading, setLoading] = useState({});

  const handleExport = async (dataType) => {
    setLoading((prev) => ({ ...prev, [dataType]: true }));
    try {
      const response = await fetch(`${API}/export/csv?data_type=${dataType}`);
      
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

  return (
    <div className="space-y-6 animate-fade-in" data-testid="export-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Export Data
        </h1>
        <p className="text-slate-500 mt-1">Download your data as CSV files</p>
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

      {/* Info Card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="text-slate-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                About CSV Exports
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                CSV files can be opened with Microsoft Excel, Google Sheets, or any spreadsheet application.
                The exported data includes all records from your database and can be used for reporting,
                analysis, or backup purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Export;
