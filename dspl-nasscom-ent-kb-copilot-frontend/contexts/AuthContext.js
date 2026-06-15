"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/config";
import {
  createUserWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoginComplete, setIsLoginComplete] = useState(false);
  const [loginError, setLoginError] = useState("");

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function googleSignIn() {
    const googleAuthProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const user = result.user;
      await saveToken(user);
      await handleLogin(user);
      setCurrentUser(user);
      setIsLoginComplete(true);
      return user;
    } catch (error) {
      console.error("Google Sign In Error:", error);
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  // Save token to backend session
  async function saveToken(user) {
    try {
      const token = await user.getIdToken();
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!sessionRes.ok) throw new Error("Failed to save session token");
    } catch (error) {
      console.error("Error saving token:", error);
    }
  }

  async function handleLogin(user) {
    if (!user?.email) return;
    setLoginError("");

    try {
      // Use the proxied /api/users endpoint to check existence
      const res = await fetch(`/api/users?email=${encodeURIComponent(user.email)}`, {
        headers: { "accept": "application/json" }
      });
      
      if (!res.ok) {
        throw new Error(`Auth verification failed: ${res.status}`);
      }

      const usersData = await res.json();
      // Handle both direct array and wrapped data mapping
      const dataList = Array.isArray(usersData) ? usersData : (usersData.users || usersData.data || []);
      
      // Since it's a substring search on the backend, find exact match
      const foundUser = dataList.find(u => u.email === user.email);
      console.log("foundUser", foundUser);

      if (foundUser) {
        const userRole = foundUser.role || "User";
        setRole(userRole);         
        return foundUser;
      } else {
        setLoginError("User does not exist in the system. Please contact an administrator.");
        throw new Error("Unauthorized: User not found in backend");
      }
    } catch (error) {
      console.error("Login verification error:", error);
      throw error;
    }
  }

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await saveToken(user); // save token on login
        // Only call handleLogin if we haven't completed login yet
        if (!isLoginComplete) {
          try {
            await handleLogin(user);
            setIsLoginComplete(true);
          } catch (error) {
            console.error("Auto-login failed:", error);
          }
        }
      } else {
        setIsLoginComplete(false);
      }

      setLoading(false);
    });

    // Listen for token refresh every hour
    const refreshInterval = setInterval(async () => {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true); // force refresh
        await saveToken(auth.currentUser);
      }
    }, 10 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const value = {
    currentUser,
    role,
    loading,
    loginError,
    signup,
    googleSignIn,
    logout, 
    isLoginComplete,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
