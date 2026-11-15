import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../api/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (fullName?: string, currentPassword?: string, newPassword?: string) => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("trustmedia_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("trustmedia_token");
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await api.auth.me();
        setUser(profile);
        localStorage.setItem("trustmedia_user", JSON.stringify(profile));
      } catch (err) {
        // Token expired or invalid
        setUser(null);
        setToken(null);
        localStorage.removeItem("trustmedia_token");
        localStorage.removeItem("trustmedia_user");
      } finally {
        setIsLoading(false);
      }
    };
    verifyUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("trustmedia_token", res.access_token);
    localStorage.setItem("trustmedia_user", JSON.stringify(res.user));
    setIsAuthModalOpen(false);
  };

  const register = async (email: string, password: string, fullName: string) => {
    const res = await api.auth.register(email, password, fullName);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem("trustmedia_token", res.access_token);
    localStorage.setItem("trustmedia_user", JSON.stringify(res.user));
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
    setToken(null);
  };

  const updateProfile = async (fullName?: string, currentPassword?: string, newPassword?: string) => {
    const updated = await api.auth.updateProfile(fullName, currentPassword, newPassword);
    setUser(updated);
    localStorage.setItem("trustmedia_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

