import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Package, MapPin, Calendar, Trash2, Edit } from "lucide-react";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [formData, setFormData] = useState({
    serial_number: "",
    model_name: "Vivera Monobloc",
    location: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await axios.put(`${API}/products/${editProduct.id}`, formData);
        toast.success("Product updated successfully");
      } else {
        await axios.post(`${API}/products`, formData);
        toast.success("Product registered successfully");
      }
      setDialogOpen(false);
      setEditProduct(null);
      setFormData({ serial_number: "", model_name: "Vivera Monobloc", location: "", notes: "" });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save product");
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setFormData({
      serial_number: product.serial_number,
      model_name: product.model_name,
      location: product.location || "",
      notes: product.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${id}`);
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="products-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Products
          </h1>
          <p className="text-slate-500 mt-1">Manage registered stretchers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditProduct(null);
            setFormData({ serial_number: "", model_name: "Vivera Monobloc", location: "", notes: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="add-product-btn">
              <Plus size={18} className="mr-2" />
              Register Product
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="product-dialog">
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
                <Label htmlFor="model_name">Model</Label>
                <Input
                  id="model_name"
                  value={formData.model_name}
                  onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                  data-testid="input-model-name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Hospital ABC, Ward 3"
                  data-testid="input-location"
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
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#0066CC] hover:bg-[#0052A3]" data-testid="submit-product-btn">
                  {editProduct ? "Update" : "Register"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Search by serial number or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-products"
            />
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
                    <TableHead>Location</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                      <TableCell className="font-medium">{product.serial_number}</TableCell>
                      <TableCell>{product.model_name}</TableCell>
                      <TableCell>
                        {product.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-slate-400" />
                            {product.location}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar size={14} />
                          {new Date(product.registration_date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          {product.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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

export default Products;
