import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FALLBACK_PLANS, enrichPlan } from "../utils/planCatalog";
import { FUNCTIONS_BASE_URL } from "../utils/functionsBase";
import { db } from "@/config/backend";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  limit as dbLimit,
  orderBy,
  query,
} from "@/lib/localStore";
import { auth, googleProvider } from "@/config/backend";
import {
  createSessionCookie,
  clearSessionCookie as clearServerSessionCookie,
} from "@/api/session";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "@/lib/localAuth";

const AuthContext = createContext(null);

export const isAdminRole = () => false;

const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch (err) {
      return null;
    }
  }
  return null;
};

const buildPlans = () => FALLBACK_PLANS.map((plan) => enrichPlan(plan));
const FALLBACK_ORDER = FALLBACK_PLANS.map((plan) => plan.slug);

const PLAN_STATUS_ENDPOINT = `${FUNCTIONS_BASE_URL}/plan_status`;
const PLAN_CHECKOUT_ENDPOINT = `${FUNCTIONS_BASE_URL}/plan_checkout`;
const PLAN_PORTAL_ENDPOINT = `${FUNCTIONS_BASE_URL}/plan_billing_portal`;
const HAS_BACKEND = Boolean(FUNCTIONS_BASE_URL);
// Crypto payments are handled via plan_checkout (POST with payment_method=crypto) and plan_status (GET with crypto_payment_id)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [usage, setUsage] = useState([]);
  const [plans, setPlans] = useState(buildPlans);
  const plansRef = useRef(plans);
  const [planStatus, setPlanStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balanceCents, setBalanceCents] = useState(0);
  const lastSessionTokenRef = useRef(null);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (sessionUser) => {
      if (!sessionUser) {
        setUser(null);
        setToken(null);
        if (lastSessionTokenRef.current) {
          lastSessionTokenRef.current = null;
          clearServerSessionCookie().catch(() => {});
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const idToken = await sessionUser.getIdToken();
        const userData = {
          uid: sessionUser.uid,
          email: sessionUser.email,
          displayName: sessionUser.displayName,
          photoURL: sessionUser.photoURL,
          emailVerified: sessionUser.emailVerified,
          username:
            sessionUser.displayName || sessionUser.email?.split("@")[0],
          balance_cents: balanceCents,
          balance_usd: (balanceCents / 100).toFixed(2),
          role: undefined,
          isAdmin: false,
        };
        setUser(userData);
        setToken(idToken);
        if (idToken && lastSessionTokenRef.current !== idToken) {
          lastSessionTokenRef.current = idToken;
          try {
            await createSessionCookie(idToken);
          } catch (err) {
            console.error("Failed to refresh session cookie", err);
          }
        }
      } catch (err) {
        console.error("Failed to hydrate auth session", err);
        setToken(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [balanceCents]);

  const applyBalance = useCallback(
    (nextBalanceCents) => {
      if (!user) {
        return;
      }
      setBalanceCents(nextBalanceCents);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              balance_cents: nextBalanceCents,
              balance_usd: (nextBalanceCents / 100).toFixed(2),
            }
          : prev,
      );
    },
    [user],
  );

  const updateQuotaState = useCallback((data) => {
    if (!data) return;
    const quotas = data.quota ? data.quota : data;
    const total = Number(quotas.quota_total ?? quotas.total ?? 0);
    const used = Number(quotas.quota_used ?? quotas.used ?? 0);
    const remaining =
      typeof quotas.remaining === "number"
        ? Math.max(0, quotas.remaining)
        : Math.max(0, total - used);
    const resetAt = quotas.reset_at || quotas.resetAt || null;
    setUser((prev) =>
      prev
        ? {
            ...prev,
            quota_total: total,
            quota_used: used,
            quota_remaining: remaining,
            quota_reset_at: resetAt,
          }
        : prev,
    );
  }, []);

  const hydratePlans = useCallback((serverPlans) => {
    if (!Array.isArray(serverPlans) || serverPlans.length === 0) {
      return buildPlans();
    }
    const orderMap = new Map(
      FALLBACK_ORDER.map((slug, index) => [slug, index]),
    );
    const hydrated = serverPlans.map((plan) => {
      const slug = (plan?.slug || plan?.plan_slug || plan?.id || "")
        .toString()
        .trim();
      const normalizedSlug = slug || "free";
      const enriched = enrichPlan({ ...plan, slug: normalizedSlug });
      return {
        ...plan,
        slug: normalizedSlug,
        ...enriched,
      };
    });
    hydrated.sort((a, b) => {
      const aIndex = orderMap.has(a.slug)
        ? orderMap.get(a.slug)
        : Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.has(b.slug)
        ? orderMap.get(b.slug)
        : Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
    return hydrated;
  }, []);

  const applyPlanSnapshot = useCallback((payload) => {
    if (!payload) return;
    const planPayload = payload.plan || payload;
    const quotaPayload = payload.quota || payload;
    const subscriptionPayload = payload.subscription || null;
    const subscriptionStatus =
      payload.subscription_status || subscriptionPayload?.status || null;
    setUser((prev) => {
      if (!prev) {
        return prev;
      }
      const slug =
        (
          planPayload?.slug ||
          planPayload?.plan_slug ||
          quotaPayload?.plan_slug ||
          prev.plan_slug ||
          "free"
        )
          .toString()
          .trim() || "free";
      const enriched = planPayload
        ? enrichPlan({ ...planPayload, slug })
        : null;
      const dailyLimit =
        enriched?.daily_token_limit ??
        planPayload?.daily_token_limit ??
        prev.plan?.daily_token_limit ??
        null;
      const dailyQuotaSnapshot = dailyLimit
        ? {
            fast: dailyLimit,
            balanced: dailyLimit,
            deep: dailyLimit,
            strict: true,
          }
        : prev.plan?.daily_quota || null;
      const nextResetAt =
        quotaPayload?.reset_at ||
        quotaPayload?.resetAt ||
        prev.plan?.next_reset_at ||
        prev.quota_reset_at ||
        null;
      const nextPlan = enriched
        ? {
            ...enriched,
            slug,
            daily_token_limit: dailyLimit,
            daily_quota: dailyQuotaSnapshot,
            subscription: subscriptionPayload,
            subscription_status: subscriptionStatus,
            next_reset_at: nextResetAt,
          }
        : prev.plan
          ? {
              ...prev.plan,
              slug: prev.plan.slug || slug,
              daily_token_limit: prev.plan.daily_token_limit ?? dailyLimit,
              daily_quota: dailyQuotaSnapshot || prev.plan.daily_quota || null,
              subscription:
                subscriptionPayload ?? prev.plan.subscription ?? null,
              subscription_status:
                subscriptionStatus ?? prev.plan.subscription_status ?? null,
              next_reset_at: nextResetAt,
            }
          : null;
      return {
        ...prev,
        plan_slug: slug,
        plan: nextPlan,
      };
    });
  }, []);

  const applyServerPlans = useCallback(
    (serverPlans) => {
      const hydrated = hydratePlans(serverPlans);
      setPlans(hydrated);
      return hydrated;
    },
    [hydratePlans],
  );

  const buildFallbackPlanStatus = useCallback(() => {
    const fallbackPlans = buildPlans();
    const fallbackPlan = fallbackPlans.find((plan) => plan.slug === "free") || fallbackPlans[0];
    const quota = {
      total: fallbackPlan?.daily_token_limit ?? 0,
      used: 0,
      remaining: fallbackPlan?.daily_token_limit ?? 0,
      plan_slug: fallbackPlan?.slug || "free",
    };
    return {
      plan: fallbackPlan,
      quota,
      plans: fallbackPlans,
    };
  }, []);

  const fetchPlanStatus = useCallback(async () => {
    if (!token) {
      return null;
    }
    if (!HAS_BACKEND) {
      const fallback = buildFallbackPlanStatus();
      setPlanStatus(fallback);
      if (fallback?.quota) {
        updateQuotaState(fallback.quota);
      }
      applyPlanSnapshot(fallback);
      applyServerPlans(fallback.plans || []);
      return fallback;
    }
    try {
      const response = await fetch(PLAN_STATUS_ENDPOINT, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to load plan status");
      }
      const payload = await response.json();
      setPlanStatus(payload);
      if (payload?.quota) {
        updateQuotaState(payload.quota);
      }
      applyPlanSnapshot(payload);
      if (Array.isArray(payload?.plans) && payload.plans.length) {
        applyServerPlans(payload.plans);
      }
      const targetPlanSlug =
        payload?.quota?.plan_slug || payload?.plan?.slug || null;
      if (targetPlanSlug && auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult();
          const claimPlanSlug =
            tokenResult?.claims?.plan_slug || tokenResult?.claims?.plan || null;
          if (claimPlanSlug !== targetPlanSlug) {
            const refreshedToken = await auth.currentUser.getIdToken(true);
            if (refreshedToken && refreshedToken !== token) {
              setToken(refreshedToken);
            }
          }
        } catch (refreshErr) {
          console.warn("Failed to refresh token after plan status", refreshErr);
        }
      }
      return payload;
    } catch (err) {
      console.error("Failed to fetch plan status", err);
      const fallback = buildFallbackPlanStatus();
      setPlanStatus(fallback);
      if (fallback?.quota) {
        updateQuotaState(fallback.quota);
      }
      applyPlanSnapshot(fallback);
      applyServerPlans(fallback.plans || []);
      return fallback;
    }
  }, [token, updateQuotaState, applyPlanSnapshot, applyServerPlans, buildFallbackPlanStatus]);

  useEffect(() => {
    if (!token) {
      setPlanStatus(null);
      setPlans(buildPlans());
      return;
    }
    fetchPlanStatus().catch(() => {});
  }, [token, fetchPlanStatus]);

  const loadAccountData = useCallback(
    async (uid) => {
      if (!uid) return null;
      try {
        const usageDocRef = doc(db, "usage", uid);
        const snapshot = await getDoc(usageDocRef);
        if (!snapshot.exists()) {
          return null;
        }
        const data = snapshot.data() || {};
        updateQuotaState(data);
        if (data?.plan_snapshot) {
          applyPlanSnapshot({
            plan: data.plan_snapshot,
            quota: data,
            subscription: data.subscription,
            subscription_status: data.subscription_status,
          });
        }
        return data;
      } catch (err) {
        console.error("Failed to load account data", err);
        return null;
      }
    },
    [updateQuotaState, applyPlanSnapshot],
  );

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      // User is handled by the onAuthStateChanged listener
      return userCredential.user;
    } catch (err) {
      let errorMessage = "Login failed";
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/user-disabled":
          errorMessage = "This account has been disabled";
          break;
        case "auth/too-many-requests":
          errorMessage =
            "Too many failed login attempts. Please try again later";
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      // User is handled by the onAuthStateChanged listener
      return userCredential.user;
    } catch (err) {
      let errorMessage = "Registration failed";
      switch (err.code) {
        case "auth/email-already-in-use":
          errorMessage = "An account with this email already exists";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        case "auth/weak-password":
          errorMessage = "Password should be at least 6 characters";
          break;
        case "auth/operation-not-allowed":
          errorMessage = "Email/password accounts are not enabled";
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearServerSessionCookie().catch(() => {});
      await signOut(auth);
      lastSessionTokenRef.current = null;
      // State is handled by the onAuthStateChanged listener
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Google Sign In
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      let errorMessage = "Google sign-in failed";
      switch (err.code) {
        case "auth/popup-closed-by-user":
          errorMessage = "Sign-in popup was closed before completion";
          break;
        case "auth/popup-blocked":
          errorMessage = "Sign-in popup was blocked by the browser";
          break;
        case "auth/cancelled-popup-request":
          errorMessage = "Sign-in was cancelled";
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Password Reset
  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setLoading(false);
    } catch (err) {
      let errorMessage = "Password reset failed";
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address";
          break;
        default:
          errorMessage = err.message;
      }
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  const refreshUsage = useCallback(
    async (limitCount = 20) => {
      const current = auth.currentUser;
      if (!current) {
        setUsage([]);
        return [];
      }
      try {
        const usageDocRef = doc(db, "usage", current.uid);
        const logsQuery = query(
          collection(usageDocRef, "logs"),
          orderBy("created_at", "desc"),
          dbLimit(limitCount),
        );
        const [usageSnapshot, logsSnapshot] = await Promise.all([
          getDoc(usageDocRef),
          getDocs(logsQuery),
        ]);

        if (usageSnapshot.exists()) {
          updateQuotaState(usageSnapshot.data());
        }

        const rows = logsSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          const tokensReserved = Number(data.tokens_reserved ?? 0);
          const modelCode = data.model_code || "shannon-1.6-pro";
          const normalizedMode =
            typeof modelCode === "string" &&
            modelCode.toLowerCase().includes("lite")
              ? "LITE"
              : "PRO";
          return {
            id: docSnap.id,
            timestamp:
              normalizeTimestamp(data.created_at) || new Date().toISOString(),
            mode: normalizedMode,
            routed_to: modelCode,
            prompt_tokens: tokensReserved,
            completion_tokens: 0,
            providers: [
              {
                codename: modelCode,
                tokens: tokensReserved,
                cost_usd: "0.00",
              },
            ],
            cost_usd: "0.00",
            latency_ms: data.latency_ms ?? "—",
          };
        });
        setUsage(rows);
        return rows;
      } catch (err) {
        console.error("Failed to refresh usage", err);
        throw err;
      }
    },
    [updateQuotaState],
  );

  useEffect(() => {
    if (user?.uid) {
      loadAccountData(user.uid).then(() => {
        refreshUsage().catch(() => {});
      });
    } else {
      setUsage([]);
    }
  }, [user?.uid, loadAccountData, refreshUsage]);

  const redeemGiftcard = useCallback(
    async (code) => {
      if (!code) {
        throw new Error("Enter a code to redeem");
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      const nextBalance = balanceCents + 500;
      applyBalance(nextBalance);
      return {
        added_cents: 500,
        added_usd: "5.00",
        balance_cents: nextBalance,
        balance_usd: (nextBalance / 100).toFixed(2),
        message: "Added $5.00 credit",
        code,
      };
    },
    [applyBalance, balanceCents],
  );

  const loadPlans = useCallback(async () => {
    if (!token) {
      return plansRef.current;
    }
    try {
      const status = await fetchPlanStatus();
      if (status?.plans) {
        return hydratePlans(status.plans);
      }
    } catch (err) {
      console.error("Failed to refresh plans", err);
    }
    return plansRef.current;
  }, [token, fetchPlanStatus, hydratePlans]);

  const startPlanCheckout = useCallback(
    async ({ planSlug, successUrl, cancelUrl, trialPeriodDays }) => {
      if (!token) {
        throw new Error("Log in to subscribe.");
      }
      if (!HAS_BACKEND) {
        throw new Error("Billing backend not configured.");
      }
      const payload = {
        plan_slug: planSlug,
      };
      if (successUrl) {
        payload.successUrl = successUrl;
      }
      if (cancelUrl) {
        payload.cancelUrl = cancelUrl;
      }
      if (typeof trialPeriodDays === "number") {
        payload.trialPeriodDays = trialPeriodDays;
      }
      const response = await fetch(PLAN_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to start checkout");
      }
      const result = await response.json();
      fetchPlanStatus().catch(() => {});
      return result;
    },
    [token, fetchPlanStatus],
  );

  const startRefillCheckout = useCallback(
    async ({ amountUsd }) => ({
      checkout_url: `https://shannon-ai.com/refill?amount=${amountUsd}`,
    }),
    [],
  );

  const openBillingPortal = useCallback(
    async (returnUrl) => {
      if (!token) {
        throw new Error("Log in to manage billing.");
      }
      if (!HAS_BACKEND) {
        throw new Error("Billing backend not configured.");
      }
      const response = await fetch(PLAN_PORTAL_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ returnUrl }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to open billing portal");
      }
      const result = await response.json();
      fetchPlanStatus().catch(() => {});
      return result;
    },
    [token, fetchPlanStatus],
  );

  const startCryptoCheckout = useCallback(
    async ({ planSlug, coin, existingPaymentId }) => {
      if (!token) {
        throw new Error("Log in to pay with crypto.");
      }
      if (!HAS_BACKEND) {
        throw new Error("Billing backend not configured.");
      }
      // Use plan_checkout with payment_method=crypto
      const response = await fetch(PLAN_CHECKOUT_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_slug: planSlug,
          coin,
          payment_method: "crypto",
          existing_payment_id: existingPaymentId,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create crypto payment");
      }
      return response.json();
    },
    [token],
  );

  const getCryptoOpenPayments = useCallback(async () => {
    if (!token) {
      throw new Error("Log in to view crypto payments.");
    }
    if (!HAS_BACKEND) {
      throw new Error("Billing backend not configured.");
    }
    const response = await fetch(`${PLAN_STATUS_ENDPOINT}?crypto_list=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to load crypto payments");
    }
    return response.json();
  }, [token]);

  const cancelCryptoPayment = useCallback(
    async (paymentId) => {
      if (!token) {
        throw new Error("Log in to cancel crypto payments.");
      }
      if (!HAS_BACKEND) {
        throw new Error("Billing backend not configured.");
      }
      const response = await fetch(PLAN_STATUS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ crypto_cancel_id: paymentId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel crypto payment");
      }
      return response.json();
    },
    [token],
  );

  const getCryptoPaymentStatus = useCallback(
    async (paymentId) => {
      if (!token) {
        throw new Error("Log in to check payment status.");
      }
      if (!HAS_BACKEND) {
        throw new Error("Billing backend not configured.");
      }
      // Use plan_status with crypto_payment_id query param
      const response = await fetch(
        `${PLAN_STATUS_ENDPOINT}?crypto_payment_id=${encodeURIComponent(paymentId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get payment status");
      }
      return response.json();
    },
    [token],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      usage,
      plans,
      loading,
      error,
      login,
      register,
      logout,
      signInWithGoogle,
      resetPassword,
      redeemGiftcard,
      refreshUsage,
      loadPlans,
      startPlanCheckout,
      startRefillCheckout,
      openBillingPortal,
      startCryptoCheckout,
      getCryptoOpenPayments,
      cancelCryptoPayment,
      getCryptoPaymentStatus,
      planStatus,
      fetchPlanStatus,
      isAdmin: false,
      isAuthenticated: Boolean(token && user),
    }),
    [
      token,
      user,
      usage,
      plans,
      loading,
      error,
      login,
      register,
      logout,
      signInWithGoogle,
      resetPassword,
      redeemGiftcard,
      refreshUsage,
      loadPlans,
      startPlanCheckout,
      startRefillCheckout,
      openBillingPortal,
      startCryptoCheckout,
      getCryptoOpenPayments,
      cancelCryptoPayment,
      getCryptoPaymentStatus,
      planStatus,
      fetchPlanStatus,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
