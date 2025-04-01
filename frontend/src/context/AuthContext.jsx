import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { loginUser,registerUser } from '../api/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // If there's a token, set the user state based on the token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub, email: payload.email });
      } catch (error) {
        console.error('Error parsing token:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await loginUser({ email, password });
      if (response.status !== 200) {
        throw new Error('Login failed');
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return user;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Invalid input');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Network error. Please check your connection.');
      }
    }
  };

  const register = async (name, email, password) => {
    try {
      // Frontend validation
      if (!name || !email || !password) {
        throw new Error('All fields are required');
      }
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Invalid email format');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const response = await registerUser({ name, email, password });
      if (response.status !== 201) {
        throw new Error('Registration failed');
      }
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return user;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Registration failed');
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Network error. Please check your connection.');
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
