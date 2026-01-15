import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Wrench,
  CalendarDays,
  User
} from "lucide-react";

// Beta version technician list
const TECHNICIANS = ["Technician 1", "Technician 2", "Technician 3"];

const TechnicianDashboard = ({ selectedTechnician, onTechnicianChange }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    resolvedIssues: 0,
    scheduledMaintenance: 0,
    servicesThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [selectedTechnician]);

  const fetchStats = async () => {
    try {
      const [productsRes, issuesRes, maintenanceRes, servicesRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/issues`),
        axios.get(`${API}/scheduled-maintenance`),
        axios.get(`${API}/services`),
      ]);

      // Filter by selected technician if set
      const technicianIssues = selectedTechnician 
        ? issuesRes.data.filter(i => i.technician_name === selectedTechnician)
        : issuesRes.data;
      
      const technicianMaintenance = selectedTechnician
        ? maintenanceRes.data.filter(m => m.technician_name === selectedTechnician)
        : maintenanceRes.data;
      
      const technicianServices = selectedTechnician
        ? servicesRes.data.filter(s => s.technician_name === selectedTechnician)
        : servicesRes.data;

      // Calculate stats
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      const servicesThisMonth = technicianServices.filter(s => {
        const serviceDate = new Date(s.service_date);
        return serviceDate.getMonth() === thisMonth && serviceDate.getFullYear() === thisYear;
      }).length;

      setStats({
        totalProducts: productsRes.data.length,
        totalIssues: technicianIssues.length,
        openIssues: technicianIssues.filter(i => i.status === "open").length,
        // Count both in_progress AND in_service as "in progress" (active work)
        inProgressIssues: technicianIssues.filter(i => i.status === "in_progress" || i.status === "in_service").length,
        resolvedIssues: technicianIssues.filter(i => i.status === "resolved").length,
        scheduledMaintenance: technicianMaintenance.filter(m => m.status === "scheduled").length,
        servicesThisMonth,
      });
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subValue }) => (
    <Card className="card-hover">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {loading ? "..." : value}
            </p>
            {subValue && (
              <p className="text-xs text-slate-400 mt-1">{subValue}</p>
            )}
          </div>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="text-white" size={28} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="technician-dashboard">
      {/* Header with Technician Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {t("dashboard.title")}
          </h1>
          <p className="text-slate-500 mt-1">
            {selectedTechnician ? `${t("dashboard.welcome")}, ${selectedTechnician}` : t("technician.selectFromDashboard")}
          </p>
        </div>
        
        {/* Technician Picker */}
        <div className="flex items-center gap-3">
          <User size={20} className="text-slate-400" />
          <Select value={selectedTechnician || ""} onValueChange={onTechnicianChange}>
            <SelectTrigger className="w-56" data-testid="technician-picker">
              <SelectValue placeholder={t("technician.selectTechnician")} />
            </SelectTrigger>
            <SelectContent>
              {TECHNICIANS.map((tech) => (
                <SelectItem key={tech} value={tech}>
                  {tech}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      {selectedTechnician ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={t("dashboard.stats.totalProducts")}
              value={stats.totalProducts}
              icon={Package}
              color="bg-[#0066CC]"
            />
            <StatCard
              title={t("dashboard.stats.scheduledTasks")}
              value={stats.scheduledMaintenance}
              icon={CalendarDays}
              color="bg-purple-500"
            />
            <StatCard
              title={t("dashboard.stats.inProgress")}
              value={stats.inProgressIssues}
              icon={Clock}
              color="bg-amber-500"
            />
            <StatCard
              title={t("dashboard.stats.servicesThisMonth")}
              value={stats.servicesThisMonth}
              icon={Wrench}
              color="bg-emerald-500"
            />
          </div>

          {/* Issues Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {t("dashboard.issuesSummary")} - {selectedTechnician}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <AlertTriangle className="mx-auto text-amber-500 mb-2" size={32} />
                  <p className="text-2xl font-bold text-amber-600">{stats.openIssues}</p>
                  <p className="text-sm text-slate-500">{t("dashboard.stats.openIssues")}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="mx-auto text-blue-500 mb-2" size={32} />
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgressIssues}</p>
                  <p className="text-sm text-slate-500">{t("dashboard.stats.inProgress")}</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
                  <p className="text-2xl font-bold text-emerald-600">{stats.resolvedIssues}</p>
                  <p className="text-sm text-slate-500">{t("dashboard.stats.resolvedIssues")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <CalendarDays size={18} />
                <span>{t("navigation.calendar")} & {t("navigation.services")}</span>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <User className="mx-auto text-slate-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {t("technician.noTechnicianSelected")}
            </h2>
            <p className="text-slate-400 mt-2">
              {t("technician.selectFromDashboard")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TechnicianDashboard;
