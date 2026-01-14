import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Layouts
import AdminLayout from "@/layouts/AdminLayout";
import CustomerLayout from "@/layouts/CustomerLayout";
import TechnicianLayout from "@/layouts/TechnicianLayout";

// Pages
import Login from "@/pages/Login";

// API Configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth token storage keys
const AUTH_TOKEN_KEY = "dimeda_auth_token";
const AUTH_TYPE_KEY = "dimeda_auth_type";
const SELECTED_TECHNICIAN_KEY = "dimeda_selected_technician";

// Configure axios defaults
axios.defaults.withCredentials = true;

// Add auth token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers["X-Auth-Token"] = token;
  }
  return config;
});

// Export auth helper functions
export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const getAuthType = () => localStorage.getItem(AUTH_TYPE_KEY);
export const setAuthToken = (token, type = "admin") => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_TYPE_KEY, type);
};
export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_TYPE_KEY);
  localStorage.removeItem(SELECTED_TECHNICIAN_KEY);
};
export const getSelectedTechnician = () => localStorage.getItem(SELECTED_TECHNICIAN_KEY);
export const setSelectedTechnician = (tech) => localStorage.setItem(SELECTED_TECHNICIAN_KEY, tech);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authType, setAuthType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    const storedType = getAuthType();
    
    if (!token) {
      setIsAuthenticated(false);
      setAuthType(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/check`);
      setIsAuthenticated(response.data.authenticated);
      setAuthType(response.data.type || storedType);
      if (!response.data.authenticated) {
        clearAuthToken();
        setAuthType(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setAuthType(null);
      clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLoginSuccess = (token) => {
    setAuthToken(token, "admin");
    setIsAuthenticated(true);
    setAuthType("admin");
  };

  const handleTechnicianLoginSuccess = (token) => {
    setAuthToken(token, "technician");
    setIsAuthenticated(true);
    setAuthType("technician");
  };

  const handleCustomerLoginSuccess = (token) => {
    setAuthToken(token, "customer");
    setIsAuthenticated(true);
    setAuthType("customer");
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    setAuthType(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              authType === "customer" ? (
                <Navigate to="/customer" replace />
              ) : authType === "technician" ? (
                <Navigate to="/technician" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Login 
                onLoginSuccess={handleAdminLoginSuccess}
                onTechnicianLoginSuccess={handleTechnicianLoginSuccess}
                onCustomerLoginSuccess={handleCustomerLoginSuccess}
              />
            )
          } 
        />
        
        {/* Customer Portal Routes */}
        <Route 
          path="/customer/*" 
          element={
            isAuthenticated && authType === "customer" ? (
              <CustomerLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Technician Portal Routes */}
        <Route 
          path="/technician/*" 
          element={
            isAuthenticated && authType === "technician" ? (
              <TechnicianLayout onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        {/* Admin Portal Routes */}
        <Route 
          path="/*" 
          element={
            isAuthenticated && authType === "admin" ? (
              <AdminLayout 
                isAuthenticated={isAuthenticated} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
