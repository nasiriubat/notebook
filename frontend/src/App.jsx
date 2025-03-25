import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { NotebookProvider } from "./context/NotebookContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotebookPage from "./pages/NotebookPage";
import ProtectedRoute from "./components/ProtectedRoute";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

// Separate App Routes for conditional rendering
function AppRoutes() {
  const { user } = useContext(AuthContext);

  return (
    <BrowserRouter>
      {user ? (
        <NotebookProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/notebook/:id" element={<ProtectedRoute><NotebookPage /></ProtectedRoute>} />
          </Routes>
        </NotebookProvider>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
