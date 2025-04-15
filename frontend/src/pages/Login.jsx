import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getTranslation } from '../utils/ln';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error("Login error:", err);
      // The error message is already extracted in the login function
      setError(err.message || getTranslation('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100">
      <Navbar />
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card">
              <div className="card-body p-4">
                <h2 className="text-center mb-4">{getTranslation('login')}</h2>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      {getTranslation('email')}
                    </label>
                    <input
                      type="email"
                      className={`form-control ${error ? 'is-invalid' : ''}`}
                      id="email"
                      value={email}
                      onChange={handleEmailChange}
                      required
                    />
                    {error && (
                      <div className="invalid-feedback">
                        {getTranslation('invalidCredentials')}
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password" className="form-label">
                      {getTranslation('password')}
                    </label>
                    <input
                      type="password"
                      className={`form-control ${error ? 'is-invalid' : ''}`}
                      id="password"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                    ) : null}
                    {getTranslation('login')}
                  </button>
                </form>
                <div className="text-center mt-3">
                  <p className="mb-0">
                    {getTranslation('dontHaveAccount')}{" "}
                    <Link to="/register" className="text-decoration-none">
                      {getTranslation('register')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
