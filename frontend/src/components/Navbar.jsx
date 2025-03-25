import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar navbar-dark bg-dark p-3">
      <Link to="/" className="navbar-brand">NotebookLM Clone</Link>
      <div>
        {user ? (
          <div className="dropdown">
            <button className="btn btn-outline-light dropdown-toggle" data-bs-toggle="dropdown">
              <i className="bi bi-person-circle"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li><Link to="/forgot-password" className="dropdown-item">Change Password</Link></li>
              <li><button className="dropdown-item" onClick={logout}>Logout</button></li>
            </ul>
          </div>
        ) : (
          <>
            <Link to="/login" className="btn btn-outline-light me-2">Login</Link>
            <Link to="/register" className="btn btn-outline-light">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
