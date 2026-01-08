import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
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
import { AlertTriangle, Plus, CheckCircle, Clock } from "lucide-react";

// Warranty options
const WARRANTY_OPTIONS = ["Warranty", "Non Warranty"];

const CustomerDashboard = () => {
  const [products, setProducts] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    issue_type: "",
    title: "",
    description: "",
    warranty_status: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, issuesRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/issues?source=customer`),
      ]);
      setProducts(productsRes.data);
      setMyIssues(issuesRes.data.filter(i => i.source === "customer"));
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/issues/customer`, {
        ...formData,
        severity: "high", // Customer issues are always high severity
        source: "customer",
      });
      toast.success("Issue reported successfully! Our team will be notified.");
      setDialogOpen(false);
      setFormData({
        product_id: "",
        issue_type: "",
        title: "",
        description: "",
        warranty_status: "",
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to report issue");
    }
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const statusIcons = {
    open: <AlertTriangle size={16} className="text-amber-500" />,
    in_progress: <Clock size={16} className="text-blue-500" />,
    resolved: <CheckCircle size={16} className="text-emerald-500" />,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Issue Registration
          </h1>
          <p className="text-slate-500 mt-1">
            Report issues with your Medirol equipment
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]">
              <Plus size={18} className="mr-2" />
              Report New Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#0066CC]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Report New Issue
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Product (Serial Number) *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select product" />
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
                <Label>Issue Type *</Label>
                <Select
                  value={formData.issue_type}
                  onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">Mechanical</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="cosmetic">Cosmetic</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Warranty Status *</Label>
                <Select
                  value={formData.warranty_status}
                  onValueChange={(value) => setFormData({ ...formData, warranty_status: value })}
                >
                  <SelectTrigger className="mt-1">
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
                <Label htmlFor="title">Issue Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the issue in detail..."
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
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#0066CC] hover:bg-[#0052A3]"
                  disabled={!formData.product_id || !formData.issue_type || !formData.title || !formData.description || !formData.warranty_status}
                >
                  Submit Issue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-blue-600 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-900">How it works</p>
              <p className="text-sm text-blue-700 mt-1">
                When you submit an issue, our service team will be notified immediately. 
                All customer-reported issues are automatically marked as high priority. 
                You can track the status of your issues below.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Issues */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>My Reported Issues</CardTitle>
          <CardDescription>Track the status of your submitted issues</CardDescription>
        </CardHeader>
        <CardContent>
          {myIssues.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">No issues reported yet</p>
              <p className="text-sm text-slate-400 mt-1">Click "Report New Issue" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myIssues.map((issue) => (
                <div 
                  key={issue.id} 
                  className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusIcons[issue.status]}
                        <h3 className="font-medium text-slate-900">{issue.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          issue.status === "open" ? "bg-amber-100 text-amber-800" :
                          issue.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                          "bg-emerald-100 text-emerald-800"
                        }`}>
                          {issue.status.replace("_", " ")}
                        </span>
                        {issue.warranty_status && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            issue.warranty_status === "warranty" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {issue.warranty_status === "warranty" ? "Warranty" : "Non Warranty"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        S/N: {getProductSerial(issue.product_id)} • {issue.issue_type}
                      </p>
                      <p className="text-sm text-slate-600 mt-2">{issue.description}</p>
                      {issue.resolution && (
                        <div className="mt-2 p-2 bg-emerald-50 rounded text-sm text-emerald-800">
                          <strong>Resolution:</strong> {issue.resolution}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Reported: {new Date(issue.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
