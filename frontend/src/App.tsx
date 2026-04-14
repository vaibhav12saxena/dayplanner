import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import TodayPage from "@/pages/TodayPage";
import BacklogPage from "@/pages/BacklogPage";
import AssignedByMePage from "@/pages/AssignedByMePage";
import TomorrowPage from "@/pages/TomorrowPage";
import TeamPage from "@/pages/TeamPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import YesterdayPage from "@/pages/YesterdayPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import SettingsPage from "@/pages/SettingsPage";
import RecurringPage from "@/pages/RecurringPage";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/tomorrow" element={<TomorrowPage />} />
        <Route path="/backlog" element={<BacklogPage />} />
        <Route path="/assigned" element={<AssignedByMePage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/yesterday" element={<YesterdayPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
