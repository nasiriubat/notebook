import { useParams, useNavigate } from "react-router-dom";
import { useContext, useEffect } from "react";
import Navbar from "../components/Navbar";
import SourceComponent from "../components/SourceComponent";
import ChatComponent from "../components/ChatComponent";
import NoteComponent from "../components/NoteComponent";
import { NotebookContext } from "../context/NotebookContext";

export default function NotebookPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentNotebook, fetchNotebookById, loading, error } = useContext(NotebookContext);

  useEffect(() => {
    fetchNotebookById(id);
  }, [id]);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentNotebook) {
    return (
      <div>
        <Navbar />
        <div className="container mt-4">
          <div className="alert alert-danger" role="alert">
            {error || "Notebook not found"}
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>{currentNotebook.name}</h2>
          <button className="btn btn-outline-primary" onClick={() => navigate("/")}>
            Back to Notebooks
          </button>
        </div>
        <div className="row g-4">
          <div className="col-lg-3">
            <SourceComponent notebookId={id} />
          </div>
          <div className="col-lg-6">
            <ChatComponent notebookId={id} />
          </div>
          <div className="col-lg-3">
            <NoteComponent notebookId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
