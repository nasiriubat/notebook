import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import NotebookList from "../components/NotebookList";
import { Link } from "react-router-dom";

export default function Home() {
  const { user, isLoading } = useContext(AuthContext);

  return (
    <div>
      <Navbar />
      {isLoading ? (
        <div className="container d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : !user ? (
        <div className="container d-flex flex-column align-items-center justify-content-center" style={{ height: "80vh" }}>
          <h3 className="text-muted mb-3">Register/Login to start</h3>
          <div>
            <Link to="/login" className="btn btn-primary me-2">Login</Link>
            <Link to="/register" className="btn btn-outline-primary">Register</Link>
          </div>
        </div>
      ) : (
        <NotebookList />
      )}
    </div>
  );
}
