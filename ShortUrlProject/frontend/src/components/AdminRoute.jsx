import { Navigate } from "react-router-dom";

export default function AdminRoute({ role, children }) {
  if (role !== "admin") return <Navigate to="/" replace />;
  return children;
}
