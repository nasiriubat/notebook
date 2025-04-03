import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { NotebookProvider } from "./context/NotebookContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import "./styles/base.css";
import "./styles/theme.css";
import Home from "./pages/Home";
import NotebookPage from "./pages/NotebookPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NotebookProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notebook/:id"
                element={
                  <ProtectedRoute>
                    <NotebookPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </NotebookProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
