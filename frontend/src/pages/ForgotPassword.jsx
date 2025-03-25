import { useState } from "react";
import { forgetPassword } from "../api/api";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await forgetPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError("Failed to send reset link. Please try again.");
      console.error("Forgot password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ height: "100vh" }}>
      <div className="card p-4 shadow-lg w-50">
        <h2 className="text-center">Forgot Password</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && (
          <div className="alert alert-success">
            Reset link sent to your email. Please check your inbox.
          </div>
        )}
        <form onSubmit={handleForgotPassword}>
          <div className="mb-3">
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || success}
              required
            />
          </div>
          <button 
            className="btn btn-warning w-100" 
            type="submit"
            disabled={loading || success}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ) : null}
            Send Reset Link
          </button>
        </form>
        <div className="text-center mt-3">
          <Link to="/login" className="text-decoration-none">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
