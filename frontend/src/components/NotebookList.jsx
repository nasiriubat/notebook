import { useContext, useState } from "react";
import { NotebookContext } from "../context/NotebookContext";
import NotebookCard from "./NotebookCard";
import { MdAdd } from "react-icons/md";

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

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateNotebook();
    }
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
        <div className="mt-4">
          <div className="mx-auto" style={{ maxWidth: "500px" }}>
            <div className="d-flex flex-column flex-md-row gap-2">
              <div className="flex-grow-1">
                <input
                  type="text"
                  placeholder="Enter Notebook Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="form-control form-control-lg"
                  disabled={isCreating}
                />
              </div>
              <button 
                onClick={handleCreateNotebook} 
                className="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2"
                disabled={isCreating || !name.trim()}
                style={{ minWidth: "140px" }}
              >
                {isCreating ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <MdAdd size={24} />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="container mt-5">
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
