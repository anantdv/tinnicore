import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../shared/auth";
import LoginPage from "../modules/auth/LoginPage";
import Shell from "./Shell";
import CaptivePortal from "../captive/CaptivePortal";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-full items-center justify-center text-slate-300">Loading control plane...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/captive" element={<CaptivePortal />} />
        <Route
          path="/*"
          element={
            <Protected>
              <Shell />
            </Protected>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
