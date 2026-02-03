import React, { createContext, useContext } from "react";

const noopAsync = async () => {
  throw new Error("Authentication is only available in the browser runtime.");
};

const defaultValue = {
  token: null,
  user: null,
  usage: [],
  plans: [],
  loading: false,
  error: null,
  planStatus: null,
  applyPlanSnapshot: () => {},
  updateQuotaState: () => {},
  login: noopAsync,
  register: noopAsync,
  logout: noopAsync,
  signInWithGoogle: noopAsync,
  resetPassword: noopAsync,
  redeemGiftcard: noopAsync,
  refreshUsage: async () => [],
  loadPlans: async () => [],
  startPlanCheckout: noopAsync,
  startRefillCheckout: async () => ({ checkout_url: "#" }),
  openBillingPortal: noopAsync,
  fetchPlanStatus: async () => null,
  isAdmin: false,
  isAuthenticated: false,
};

const AuthContext = createContext(defaultValue);

export function AuthProvider({ children }) {
  return (
    <AuthContext.Provider value={defaultValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function isAdminRole(role) {
  return false;
}

export default AuthContext;
