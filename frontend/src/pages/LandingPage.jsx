import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { MdBook, MdChat, MdNote, MdSource } from "react-icons/md";

export default function LandingPage() {
  return (
    <div className="min-vh-100">
      <Navbar />
      <div className="container py-5">
        <div className="row align-items-center">
          <div className="col-lg-6 mb-4 mb-lg-0">
            <h1 className="display-4 fw-bold mb-4">Your AI-Powered Notebook</h1>
            <p className="lead mb-4">
              Create, organize, and collaborate on your notes with the power of AI. 
              Transform your ideas into actionable insights with our intelligent notebook platform.
            </p>
            <div className="d-flex gap-3">
              <Link to="/login" className="btn btn-primary btn-lg">
                Login
              </Link>
              <Link to="/register" className="btn btn-outline-primary btn-lg">
                Register
              </Link>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="row g-4">
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdBook size={40} className="text-primary mb-3" />
                    <h3 className="h5">Smart Notebooks</h3>
                    <p className="text-muted mb-0">
                      Create and organize your notebooks with ease
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdChat size={40} className="text-primary mb-3" />
                    <h3 className="h5">AI Chat</h3>
                    <p className="text-muted mb-0">
                      Interact with AI to enhance your learning
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdNote size={40} className="text-primary mb-3" />
                    <h3 className="h5">Smart Notes</h3>
                    <p className="text-muted mb-0">
                      Take and organize notes efficiently
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100 border-0 shadow-sm">
                  <div className="card-body text-center p-4">
                    <MdSource size={40} className="text-primary mb-3" />
                    <h3 className="h5">Source Management</h3>
                    <p className="text-muted mb-0">
                      Keep track of your references and sources
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 