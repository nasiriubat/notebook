import { Link } from "react-router-dom";
import { useContext } from "react";
import { NotebookContext } from "../context/NotebookContext";
import { MdDeleteForever } from "react-icons/md";


export default function NotebookCard({ notebook }) {
  const { removeNotebook } = useContext(NotebookContext);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this notebook?")) {
      await removeNotebook(notebook.id);
    }
  };

  return (
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <div className="card p-3 shadow h-100">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">{notebook.name}</h4>
          <button 
            className="btn btn-sm btn-outline-danger"
            onClick={handleDelete}
          >
           <MdDeleteForever />

          </button>
        </div>
        <div className="mt-3">
          <Link 
            to={`/notebook/${notebook.id}`} 
            className="btn btn-outline-primary w-100"
          >
            Open Notebook
          </Link>
        </div>
      </div>
    </div>
  );
}
