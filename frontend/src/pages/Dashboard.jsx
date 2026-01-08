import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Wrench, AlertTriangle, CheckCircle, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentServices, setRecentServices] = useState([]);
  const [openIssues, setOpenIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, servicesRes, issuesRes, productsRes] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/services`),
        axios.get(`${API}/issues`),
        axios.get(`${API}/products`),
      ]);
      setStats(statsRes.data);
      setRecentServices(servicesRes.data.slice(0, 5));
      
      // Add product serial to issues
      const products = productsRes.data;
      const issuesWithSerial = issuesRes.data.map(issue => ({
        ...issue,
        product_serial: products.find(p => p.id === issue.product_id)?.serial_number || "Unknown"
      }));
      setOpenIssues(issuesWithSerial.slice(0, 8));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, testId, onClick }) => (
    <Card 
      className="card-hover cursor-pointer transition-transform hover:scale-[1.02]" 
      data-testid={testId}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {loading ? "-" : value}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="text-white" size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Service & Maintenance Overview</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate("/products")}
            className="bg-[#0066CC] hover:bg-[#0052A3]"
            data-testid="register-product-btn"
          >
            <Plus size={18} className="mr-2" />
            Register Product
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats?.total_products || 0}
          icon={Package}
          color="bg-[#0066CC]"
          testId="stat-total-products"
          onClick={() => navigate("/products")}
        />
        <StatCard
          title="Service Records"
          value={stats?.total_services || 0}
          icon={Wrench}
          color="bg-slate-700"
          testId="stat-total-services"
          onClick={() => navigate("/services")}
        />
        <StatCard
          title="Open Issues"
          value={stats?.open_issues || 0}
          icon={AlertTriangle}
          color="bg-[#FA4616]"
          testId="stat-open-issues"
          onClick={() => navigate("/issues?status=open")}
        />
        <StatCard
          title="Resolved Issues"
          value={stats?.resolved_issues || 0}
          icon={CheckCircle}
          color="bg-emerald-500"
          testId="stat-resolved-issues"
          onClick={() => navigate("/issues?status=resolved")}
        />
      </div>

      {/* Product Hero */}
      <Card className="overflow-hidden" data-testid="product-hero-card">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 flex flex-col justify-center">
            <span className="text-[#FA4616] font-semibold text-sm uppercase tracking-wide">Official Service Partner</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Medirol Stretchers
            </h2>
            <p className="text-slate-600 mt-3">
              Dimeda is the official service provider for Medirol powered stretchers. 
              Track maintenance, log issues, and ensure optimal equipment performance.
            </p>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => navigate("/services")}
                className="bg-[#0066CC] hover:bg-[#0052A3]"
                data-testid="log-service-btn"
              >
                Log Service
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/issues")}
                data-testid="report-issue-btn"
              >
                Report Issue
              </Button>
            </div>
          </div>
          <div className="bg-slate-50 p-6 flex items-center justify-center">
            <img
              src="https://www.medirol.cz/wp-content/uploads/2025/09/vivera-monobloc-hero-6-1024x1024.png"
              alt="Medirol Vivera Monobloc"
              className="max-h-64 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
      </Card>

      {/* Recent Activity Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Services */}
        <Card data-testid="recent-services-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Services</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/services")}
              data-testid="view-all-services-btn"
            >
              View All <ArrowRight size={16} className="ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentServices.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No service records yet</p>
            ) : (
              <div className="space-y-3">
                {recentServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    data-testid={`service-item-${service.id}`}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{service.service_type}</p>
                      <p className="text-sm text-slate-500">{service.technician_name}</p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(service.service_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Issues */}
        <Card data-testid="open-issues-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>All Issues</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/issues")}
              data-testid="view-all-issues-btn"
            >
              View All <ArrowRight size={16} className="ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {openIssues.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No issues reported</p>
            ) : (
              <div className="space-y-3">
                {openIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    data-testid={`issue-item-${issue.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{issue.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          issue.status === "open" ? "bg-amber-100 text-amber-800" :
                          issue.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                          "bg-emerald-100 text-emerald-800"
                        }`}>
                          {issue.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        S/N: {issue.product_serial || "Unknown"} • {issue.issue_type}
                        {issue.technician_name && (
                          <span className="ml-2 text-[#0066CC]">• {issue.technician_name}</span>
                        )}
                      </p>
                    </div>
                    <span className={`status-badge severity-${issue.severity}`}>
                      {issue.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
