import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, AlertTriangle, Camera, X, MoreVertical, CheckCircle, Clock, Trash2 } from "lucide-react";

const Issues = () => {
  const [issues, setIssues] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolution, setResolution] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    product_id: "",
    issue_type: "",
    severity: "",
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`),
      ]);
      setIssues(issuesRes.data);
      setProducts(productsRes.data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/issues`, {
        ...formData,
        photos: photos,
      });
      toast.success("Issue reported successfully");
      setDialogOpen(false);
      setFormData({
        product_id: "",
        issue_type: "",
        severity: "",
        title: "",
        description: "",
      });
      setPhotos([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to report issue");
    }
  };

  const handleStatusChange = async (issueId, newStatus) => {
    if (newStatus === "resolved") {
      setSelectedIssue(issues.find((i) => i.id === issueId));
      setResolveDialogOpen(true);
      return;
    }
    try {
      await axios.put(`${API}/issues/${issueId}`, { status: newStatus });
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleResolve = async () => {
    if (!selectedIssue) return;
    try {
      await axios.put(`${API}/issues/${selectedIssue.id}`, {
        status: "resolved",
        resolution: resolution,
      });
      toast.success("Issue resolved");
      setResolveDialogOpen(false);
      setResolution("");
      setSelectedIssue(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to resolve issue");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await axios.delete(`${API}/issues/${id}`);
      toast.success("Issue deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete issue");
    }
  };

  const getProductSerial = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product?.serial_number || "Unknown";
  };

  const filteredIssues = statusFilter === "all"
    ? issues
    : issues.filter((i) => i.status === statusFilter);

  const statusIcons = {
    open: <AlertTriangle size={16} className="text-amber-500" />,
    in_progress: <Clock size={16} className="text-blue-500" />,
    resolved: <CheckCircle size={16} className="text-emerald-500" />,
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="issues-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Issues
          </h1>
          <p className="text-slate-500 mt-1">Track and resolve equipment problems</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FA4616] hover:bg-[#D9380D]" data-testid="report-issue-btn">
              <Plus size={18} className="mr-2" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="issue-dialog">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Report New Issue</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Product *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger className="mt-1" data-testid="issue-select-product">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Issue Type *</Label>
                  <Select
                    value={formData.issue_type}
                    onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="issue-select-type">
                      <SelectValue placeholder="Select type" />
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
                  <Label>Severity *</Label>
                  <Select
                    value={formData.severity}
                    onValueChange={(value) => setFormData({ ...formData, severity: value })}
                  >
                    <SelectTrigger className="mt-1" data-testid="issue-select-severity">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  data-testid="issue-input-title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of the problem..."
                  required
                  data-testid="issue-input-description"
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label>Photos (Optional)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    ref={fileInputRef}
                    className="hidden"
                    data-testid="issue-photo-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera size={18} className="mr-2" />
                    Add Photos
                  </Button>
                </div>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Upload ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FA4616] hover:bg-[#D9380D]"
                  disabled={!formData.product_id || !formData.issue_type || !formData.severity || !formData.title || !formData.description}
                  data-testid="submit-issue-btn"
                >
                  Report Issue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-slate-500">Filter by status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Issues</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4" data-testid="issues-list">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">Loading...</CardContent>
          </Card>
        ) : filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto text-slate-300" size={48} />
              <p className="text-slate-500 mt-4">No issues found</p>
              <p className="text-sm text-slate-400 mt-1">Report an issue when you find equipment problems</p>
            </CardContent>
          </Card>
        ) : (
          filteredIssues.map((issue) => (
            <Card key={issue.id} className="card-hover" data-testid={`issue-card-${issue.id}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`status-badge status-${issue.status}`}>
                        {statusIcons[issue.status]}
                        <span className="ml-1">{issue.status.replace("_", " ")}</span>
                      </span>
                      <span className={`status-badge severity-${issue.severity}`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {issue.issue_type}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mt-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {issue.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">S/N: {getProductSerial(issue.product_id)}</p>
                    <p className="text-slate-600 mt-2">{issue.description}</p>
                    {issue.resolution && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-emerald-800">
                          <strong>Resolution:</strong> {issue.resolution}
                        </p>
                      </div>
                    )}
                    {issue.photos && issue.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {issue.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Issue photo ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                      <span>Registered: {new Date(issue.created_at).toLocaleString()}</span>
                      {issue.resolved_at && (
                        <span>Resolved: {new Date(issue.resolved_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`issue-menu-${issue.id}`}>
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {issue.status !== "open" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(issue.id, "open")}>
                          <AlertTriangle size={14} className="mr-2" /> Mark as Open
                        </DropdownMenuItem>
                      )}
                      {issue.status !== "in_progress" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(issue.id, "in_progress")}>
                          <Clock size={14} className="mr-2" /> Mark In Progress
                        </DropdownMenuItem>
                      )}
                      {issue.status !== "resolved" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(issue.id, "resolved")}>
                          <CheckCircle size={14} className="mr-2" /> Mark as Resolved
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(issue.id)}
                        className="text-red-600"
                      >
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent data-testid="resolve-dialog">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Resolve Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="resolution">Resolution Notes *</Label>
              <Textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                className="mt-1"
                rows={4}
                data-testid="resolution-input"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResolve}
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={!resolution.trim()}
                data-testid="confirm-resolve-btn"
              >
                Resolve Issue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Issues;
