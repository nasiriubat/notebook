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
  const { currentNotebook, getNotebook, loading } = useContext(NotebookContext);

  useEffect(() => {
    if (id && (!currentNotebook || currentNotebook.id !== parseInt(id))) {
      getNotebook(id);
    }
  }, [id, currentNotebook, getNotebook]);

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="container mt-4">
          <div className="d-flex justify-content-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentNotebook) {
    return (
      <div>
        <Navbar />
        <div className="container mt-4">
          <div className="alert alert-danger">Notebook not found</div>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Notebooks
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
