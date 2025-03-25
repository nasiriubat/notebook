import { useContext, useState } from "react";
import { NotebookContext } from "../context/NotebookContext";
import NotebookCard from "./NotebookCard";

export default function NotebookList() {
  const { notebooks, addNotebook, loading, error } = useContext(NotebookContext);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNotebook = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    await addNotebook(name);
    setName("");
    setIsCreating(false);
  };

  if (loading && notebooks.length === 0) {
    return (
      <div className="container d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <section className="text-center mt-5">
        <h1 className="display-5">Welcome to NotebookLM Clone</h1>
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        )}
        <div className="mt-3">
          <div className="input-group w-50 mx-auto">
            <input
              type="text"
              placeholder="Enter Notebook Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-control"
              disabled={isCreating}
            />
            <button 
              onClick={handleCreateNotebook} 
              className="btn btn-primary"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : null}
              Create Notebook
            </button>
          </div>
        </div>
      </section>
      <div className="container mt-4">
        <div className="row">
          {notebooks.length > 0 ? (
            notebooks.map((notebook) => (
              <NotebookCard key={notebook.id} notebook={notebook} />
            ))
          ) : (
            <div className="col-12 text-center">
              <p className="text-muted">No notebooks found. Create one above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
