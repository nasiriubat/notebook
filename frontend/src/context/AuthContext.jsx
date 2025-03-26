import { createContext, useState, useEffect } from "react";
import { loginUser, registerUser, refreshToken } from "../api/api";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (token && storedUser) {
          setUser(storedUser);
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          startSilentRefresh();
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Start silent refresh in background
  const startSilentRefresh = () => {
    const refreshInterval = setInterval(async () => {
      try {
        const tokenExp = localStorage.getItem("token_expiry");
        if (tokenExp && new Date().getTime() >= tokenExp - 60000) {
          await refreshUserToken();
        }
      } catch (error) {
        console.error("Silent token refresh failed:", error);
        logout();
        clearInterval(refreshInterval);
      }
    }, 30000); // Check every 30 seconds
  };

  // Login and store token
  const login = async (credentials) => {
    try {
      const response = await loginUser(credentials);
      if (response.status == 200) {
        let { token, refresh_token, euser, expires_in } = response.data;
        storeToken(token, refresh_token, expires_in);
        localStorage.setItem("user", JSON.stringify(euser));
        setUser(euser);
        startSilentRefresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const register = async (credentials) => {
    try {
      const response = await registerUser(credentials);
      console.log(response);
      if (response.status == 201){
        const { token, refresh_token, user, expires_in } = response.data;
        storeToken(token, refresh_token, expires_in);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        startSilentRefresh();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  // Refresh access token
  const refreshUserToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem("refresh_token");
      if (!storedRefreshToken) return logout();

      const response = await refreshToken({ refresh_token: storedRefreshToken });
      const { token, expires_in } = response.data;
      storeToken(token, storedRefreshToken, expires_in);
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
    }
  };

  // Store tokens securely
  const storeToken = (token, refresh_token, expires_in) => {
    const tokenExpiryTime = new Date().getTime() + expires_in * 1000;

    localStorage.setItem("token", token);
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("token_expiry", tokenExpiryTime);
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  // Logout user and clear tokens
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
