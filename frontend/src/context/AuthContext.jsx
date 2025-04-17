import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { loginUser,registerUser } from '../api/api';
import { getTranslation } from '../utils/ln';

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
      console.error("Error in login():", error);
      
      // Extract error message from the response
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const status = error.response.status;
        const errorMessage = error.response.data?.error || error.response.data?.message;
        
        console.log("Error status:", status);
        console.log("Error message:", errorMessage);
        
        if (status === 401) {
          // Invalid credentials
          throw new Error(errorMessage || 'Invalid email or password');
        } else if (status === 400) {
          // Bad request - missing fields or invalid format
          throw new Error(errorMessage || 'Please check your email and password');
        } else if (status === 500) {
          // Server error
          throw new Error('Server error. Please try again later.');
        } else {
          // Other error with response
          throw new Error(errorMessage || 'Login failed. Please try again.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.log("No response received:", error.request);
        throw new Error('Network error. Please check your connection.');
      } else {
        // Something happened in setting up the request
        console.log("Error setting up request:", error.message);
        throw new Error(error.message || 'An unexpected error occurred.');
      }
    }
  };

  const register = async (name, email, password) => {
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

    try {
      const response = await registerUser({ name, email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      return user;
    } catch (error) {
      console.error("Error in register():", error);
      
      // Extract error message from the response
      if (error.response) {
        // The server responded with a status code outside the 2xx range
        const status = error.response.status;
        const errorMessage = error.response.data?.error || error.response.data?.message;
        
        console.log("Error status:", status);
        console.log("Error message:", errorMessage);
        
        if (status === 400) {
          // Bad request - could be email already exists or other validation errors
          throw new Error(errorMessage || 'Email already exists');
        } else if (status === 500) {
          // Server error
          throw new Error('Server error. Please try again later.');
        } else {
          // Other error with response
          throw new Error(errorMessage || 'Registration failed. Please try again.');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.log("No response received:", error.request);
        throw new Error('Network error. Please check your connection.');
      } else {
        // Something happened in setting up the request
        console.log("Error setting up request:", error.message);
        throw new Error(error.message || 'An unexpected error occurred.');
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
