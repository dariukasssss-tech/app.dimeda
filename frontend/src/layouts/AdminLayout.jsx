import { Routes, Route, Navigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Services from "@/pages/Services";
import Issues from "@/pages/Issues";
import Export from "@/pages/Export";
import MaintenanceCalendar from "@/pages/MaintenanceCalendar";

const AdminLayout = ({ isAuthenticated, onLogout }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation onLogout={onLogout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/calendar" element={<MaintenanceCalendar />} />
          <Route path="/services" element={<Services />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/export" element={<Export />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminLayout;
