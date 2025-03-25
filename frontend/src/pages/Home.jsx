import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import NotebookList from "../components/NotebookList";
import { Link } from "react-router-dom";

export default function Home() {
  const { user } = useContext(AuthContext);

  return (
    <div>
      <Navbar />
      {!user ? (
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
