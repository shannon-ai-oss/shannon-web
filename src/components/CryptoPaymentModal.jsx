import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockIcon from "@mui/icons-material/Lock";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/context/AuthContext";

// EMERGENCY: Crypto payments locked
const PAYMENTS_LOCKED = true;

const COINS = [
  { id: "btc", name: "Bitcoin", symbol: "BTC", color: "#f7931a" },
  { id: "ltc", name: "Litecoin", symbol: "LTC", color: "#345d9d" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", color: "#c2a633" },
];

const CryptoPaymentModal = ({ open, onClose, planSlug, planName, onSuccess, initialPaymentId }) => {
  const { startCryptoCheckout, getCryptoPaymentStatus, getCryptoOpenPayments, cancelCryptoPayment, user } = useAuth();

  const [step, setStep] = useState("select");
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [confirmations, setConfirmations] = useState(0);
  const [openPayments, setOpenPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);
  const autoResumeRef = useRef(false);

  const storageKey = useMemo(() => {
    if (!user?.uid || !planSlug || typeof window === "undefined") {
      return null;
    }
    return `crypto_payment:${user.uid}:${planSlug}`;
  }, [user?.uid, planSlug]);

  const loadCachedPayment = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.payment_id || !parsed?.coin) return null;
      if (parsed?.expires_at) {
        const expiresAt = new Date(parsed.expires_at);
        if (!Number.isNaN(expiresAt.getTime()) && expiresAt <= new Date()) {
          window.localStorage.removeItem(storageKey);
          return null;
        }
      }
      return parsed;
    } catch (err) {
      console.warn("Failed to read cached crypto payment", err);
      return null;
    }
  }, [storageKey]);

  const saveCachedPayment = useCallback((data) => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ ...data, cached_at: Date.now() }));
    } catch (err) {
      console.warn("Failed to cache crypto payment", err);
    }
  }, [storageKey]);

  const clearCachedPayment = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setCopied(false);
    setTimeLeft(null);
    setConfirmations(0);
    setPaymentsError(null);
    setStep("select");
    setSelectedCoin(null);
    setPaymentData(null);
    setOpenPayments([]);

    let active = true;
    setLoadingPayments(true);
    getCryptoOpenPayments()
      .then((data) => {
        if (!active) return;
        const payments = Array.isArray(data?.payments) ? data.payments : [];
        setOpenPayments(payments);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load crypto payments:", err);
        setPaymentsError(err.message || "Failed to load open payments");
        const cached = loadCachedPayment();
        if (cached) {
          setOpenPayments([cached]);
        }
      })
      .finally(() => {
        if (active) setLoadingPayments(false);
      });

    return () => {
      active = false;
    };
  }, [open, getCryptoOpenPayments, loadCachedPayment]);

  useEffect(() => {
    if (!open) {
      autoResumeRef.current = false;
    }
  }, [open]);

  const resumePayment = useCallback((payment) => {
    const coin = COINS.find((item) => item.id === payment.coin);
    if (!coin) return;
    setSelectedCoin(coin);
    setPaymentData(payment);
    setConfirmations(payment.confirmations || 0);
    saveCachedPayment(payment);
    setStep("payment");
  }, [saveCachedPayment]);

  const handleCancelPayment = useCallback(async (paymentId) => {
    try {
      await cancelCryptoPayment(paymentId);
      setOpenPayments((prev) => prev.filter((item) => item.payment_id !== paymentId));
      const cached = loadCachedPayment();
      if (cached?.payment_id === paymentId) {
        clearCachedPayment();
      }
    } catch (err) {
      console.error("Cancel payment failed:", err);
      setError(err.message || "Failed to cancel payment");
      setStep("error");
    }
  }, [cancelCryptoPayment, loadCachedPayment, clearCachedPayment]);

  useEffect(() => {
    if (!open || !initialPaymentId || autoResumeRef.current || loadingPayments) return;
    const match = openPayments.find((payment) => payment.payment_id === initialPaymentId);
    if (match) {
      autoResumeRef.current = true;
      resumePayment(match);
      return;
    }
    if (!loadingPayments) {
      autoResumeRef.current = true;
    }
  }, [open, initialPaymentId, openPayments, resumePayment, loadingPayments]);

  const handleCoinSelect = useCallback(async (coin) => {
    setSelectedCoin(coin);
    setStep("loading");
    setError(null);

    const existing = openPayments.find(
      (payment) =>
        payment.coin === coin.id &&
        (!planSlug || !payment.plan_slug || payment.plan_slug === planSlug),
    );
    if (existing) {
      resumePayment(existing);
      return;
    }

    try {
      const data = await startCryptoCheckout({
        planSlug,
        coin: coin.id,
        existingPaymentId: existing?.payment_id,
      });
      setPaymentData(data);
      saveCachedPayment(data);
      setOpenPayments((prev) => [data, ...prev.filter((item) => item.payment_id !== data.payment_id)]);
      setStep("payment");
    } catch (err) {
      console.error("Crypto checkout error:", err);
      setError(err.message || "Failed to create payment. Make sure the backend is deployed.");
      setStep("error");
    }
  }, [planSlug, startCryptoCheckout, openPayments, resumePayment, saveCachedPayment]);

  // Poll for status
  useEffect(() => {
    if (step !== "payment" || !paymentData?.payment_id) return;

    const poll = async () => {
      try {
        const status = await getCryptoPaymentStatus(paymentData.payment_id);
        setConfirmations(status.confirmations || 0);
        setPaymentData((prev) => {
          const next = { ...prev, ...status };
          saveCachedPayment(next);
          return next;
        });

        if (status.status === "confirmed") {
          clearCachedPayment();
          setStep("success");
          onSuccess?.();
        } else if (status.status === "canceled") {
          clearCachedPayment();
          setError("Payment canceled");
          setStep("error");
        } else if (status.status === "expired") {
          clearCachedPayment();
          setError("Payment expired");
          setStep("error");
        }
      } catch (err) {
        console.error("Status poll error:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [step, paymentData, getCryptoPaymentStatus, onSuccess, clearCachedPayment, saveCachedPayment]);

  // Timer
  useEffect(() => {
    if (step !== "payment" || !paymentData?.expires_at) return;

    const tick = () => {
      const diff = new Date(paymentData.expires_at) - new Date();
      if (diff <= 0) {
        setStep("error");
        setError("Payment expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, paymentData]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrValue = useMemo(() => {
    if (!paymentData || !selectedCoin) return "";
    const prefix = selectedCoin.id === "btc" ? "bitcoin" : selectedCoin.id === "ltc" ? "litecoin" : "dogecoin";
    const amount = paymentData.amount_crypto ? `?amount=${paymentData.amount_crypto}` : "";
    return `${prefix}:${paymentData.address}${amount}`;
  }, [paymentData, selectedCoin]);

  const sortedPayments = useMemo(() => {
    const parsed = Array.isArray(openPayments) ? [...openPayments] : [];
    return parsed.sort((a, b) => {
      const aTime = new Date(a?.created_at || 0).getTime();
      const bTime = new Date(b?.created_at || 0).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }, [openPayments]);

  const activePayments = useMemo(() => {
    if (!planSlug) return sortedPayments;
    return sortedPayments.filter(
      (payment) => !payment.plan_slug || payment.plan_slug === planSlug,
    );
  }, [sortedPayments, planSlug]);

  return (
    <Dialog open={open} onClose={step === "loading" ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{
      sx: {
        borderRadius: 3,
        bgcolor: "#0d1117",
        border: "1px solid #30363d",
        backgroundImage: "none",
      }
    }}>
      <Box sx={{ position: "relative", p: 3 }}>
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8, color: "#8b949e" }}>
          <CloseIcon />
        </IconButton>

        {/* EMERGENCY LOCK */}
        {PAYMENTS_LOCKED && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <LockIcon sx={{ fontSize: 64, color: "#f85149" }} />
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 600, color: "#e6edf3" }}>
              Payments Temporarily Disabled
            </Typography>
            <Typography sx={{ color: "#8b949e", mt: 1, fontSize: 14 }}>
              Crypto payments are currently locked for security reasons.
            </Typography>
            <Button onClick={onClose} variant="contained" sx={{ mt: 3, bgcolor: "#21262d", "&:hover": { bgcolor: "#30363d" } }}>
              Close
            </Button>
          </Box>
        )}

        {/* COIN SELECT */}
        {!PAYMENTS_LOCKED && step === "select" && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: "#e6edf3" }}>
              Pay with Crypto
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "#8b949e" }}>
              Select currency for {planName || "your plan"}
            </Typography>

            {loadingPayments && (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                <CircularProgress size={18} sx={{ color: "#58a6ff" }} />
                <Typography variant="caption" sx={{ color: "#8b949e" }}>
                  Loading open payments...
                </Typography>
              </Box>
            )}

            {!loadingPayments && activePayments.length > 0 && (
              <Box sx={{ mb: 3, textAlign: "left" }}>
                <Typography variant="caption" sx={{ color: "#8b949e", display: "block", mb: 1 }}>
                  Unfinished payments
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {activePayments.map((payment) => {
                    const coin = COINS.find((item) => item.id === payment.coin);
                    const amountLabel = payment.amount_crypto
                      ? `${payment.amount_crypto} ${coin?.symbol || (payment.coin || "").toUpperCase()}`
                      : "Amount pending";
                    const addressLabel = payment.address || "Address unavailable";
                    const planLabel = payment.plan_slug ? payment.plan_slug : "Unknown plan";
                    const canResume = Boolean(coin && payment.address);
                    const expiresAt = payment.expires_at ? new Date(payment.expires_at) : null;
                    const expiresLabel =
                      expiresAt && !Number.isNaN(expiresAt.getTime())
                        ? expiresAt.toLocaleString()
                        : null;
                    return (
                      <Box key={payment.payment_id} sx={{ p: 2, borderRadius: 2, bgcolor: "#161b22", border: "1px solid #30363d" }}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: "#e6edf3" }}>
                              {coin?.name || payment.coin?.toUpperCase()} • {amountLabel}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#8b949e" }}>
                              {addressLabel}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#8b949e", display: "block", marginTop: 4 }}>
                              {planLabel}
                            </Typography>
                          </Box>
                          {expiresLabel && (
                            <Typography variant="caption" sx={{ color: "#8b949e", whiteSpace: "nowrap" }}>
                              Expires {expiresLabel}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => resumePayment(payment)}
                            disabled={!canResume}
                            sx={{ bgcolor: "#238636", "&:hover": { bgcolor: "#2ea043" } }}
                          >
                            Resume
                          </Button>
                          <Button size="small" onClick={() => handleCancelPayment(payment.payment_id)} sx={{ color: "#f85149" }}>
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {paymentsError && (
              <Typography variant="caption" sx={{ color: "#f85149", mb: 2, display: "block" }}>
                {paymentsError}
              </Typography>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {COINS.map((coin) => (
                <Button
                  key={coin.id}
                  onClick={() => handleCoinSelect(coin)}
                  sx={{
                    py: 2,
                    px: 3,
                    borderRadius: 2,
                    border: "1px solid #30363d",
                    bgcolor: "#161b22",
                    color: "#e6edf3",
                    justifyContent: "flex-start",
                    textTransform: "none",
                    "&:hover": { bgcolor: "#21262d", borderColor: coin.color },
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: "50%", bgcolor: coin.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    mr: 2, fontWeight: 700, fontSize: 14, color: "#fff"
                  }}>
                    {coin.symbol.charAt(0)}
                  </Box>
                  <Box sx={{ textAlign: "left" }}>
                    <Typography sx={{ fontWeight: 600, color: "#e6edf3" }}>{coin.name}</Typography>
                    <Typography variant="caption" sx={{ color: "#8b949e" }}>{coin.symbol}</Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
        )}

        {/* LOADING */}
        {!PAYMENTS_LOCKED && step === "loading" && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <CircularProgress size={48} sx={{ color: selectedCoin?.color || "#58a6ff" }} />
            <Typography sx={{ mt: 2, color: "#8b949e" }}>
              Creating {selectedCoin?.name} payment...
            </Typography>
          </Box>
        )}

        {/* PAYMENT */}
        {!PAYMENTS_LOCKED && step === "payment" && paymentData && (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#e6edf3", mb: 0.5 }}>
              Send {selectedCoin?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: "#8b949e" }}>
              Expires in {timeLeft || "..."}
            </Typography>

            <Box sx={{ my: 3, p: 2, bgcolor: "#fff", borderRadius: 2, display: "inline-block" }}>
              <QRCodeSVG value={qrValue} size={180} level="M" />
            </Box>

            <Box sx={{ mb: 2, p: 2, bgcolor: "#161b22", borderRadius: 2, border: "1px solid #30363d" }}>
              <Typography variant="caption" sx={{ color: "#8b949e", display: "block", mb: 0.5 }}>
                Amount
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                <Typography sx={{ fontFamily: "monospace", fontSize: 20, fontWeight: 600, color: selectedCoin?.color }}>
                  {paymentData.amount_crypto || "--"}
                </Typography>
                <Typography sx={{ color: "#8b949e" }}>{selectedCoin?.symbol}</Typography>
                <IconButton size="small" onClick={() => copyToClipboard(paymentData.amount_crypto || "")} sx={{ color: "#8b949e" }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" sx={{ color: "#8b949e" }}>
                {paymentData.amount_usd ? `≈ $${paymentData.amount_usd} USD` : "Amount pending"}
              </Typography>
            </Box>

            <Box sx={{ p: 2, bgcolor: "#161b22", borderRadius: 2, border: "1px solid #30363d" }}>
              <Typography variant="caption" sx={{ color: "#8b949e", display: "block", mb: 0.5 }}>
                Address
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{
                  fontFamily: "monospace", fontSize: 11, color: "#e6edf3",
                  wordBreak: "break-all", flex: 1, textAlign: "left"
                }}>
                  {paymentData.address || "Address unavailable"}
                </Typography>
                <IconButton size="small" onClick={() => copyToClipboard(paymentData.address || "")} sx={{ color: "#8b949e" }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {confirmations > 0 && (
              <Box sx={{ mt: 2, p: 1.5, bgcolor: "#1f6feb22", borderRadius: 2, border: "1px solid #1f6feb" }}>
                <Typography sx={{ color: "#58a6ff", fontSize: 14 }}>
                  {confirmations} / {paymentData.required_confirmations} confirmations
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 1.5 }}>
              <Button onClick={() => setStep("select")} sx={{ color: "#58a6ff" }}>
                View open payments
              </Button>
              <Button onClick={onClose} sx={{ color: "#8b949e" }}>
                Close
              </Button>
            </Box>
          </Box>
        )}

        {/* SUCCESS */}
        {!PAYMENTS_LOCKED && step === "success" && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: "#3fb950" }} />
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 600, color: "#e6edf3" }}>
              Payment Confirmed!
            </Typography>
            <Typography sx={{ color: "#8b949e", mt: 1 }}>
              {planName} is now active
            </Typography>
            <Button onClick={onClose} variant="contained" sx={{ mt: 3, bgcolor: "#238636", "&:hover": { bgcolor: "#2ea043" } }}>
              Done
            </Button>
          </Box>
        )}

        {/* ERROR */}
        {!PAYMENTS_LOCKED && step === "error" && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <ErrorOutlineIcon sx={{ fontSize: 64, color: "#f85149" }} />
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 600, color: "#e6edf3" }}>
              Error
            </Typography>
            <Typography sx={{ color: "#8b949e", mt: 1, fontSize: 14 }}>
              {error}
            </Typography>
            <Box sx={{ mt: 3, display: "flex", gap: 1, justifyContent: "center" }}>
              <Button onClick={onClose} sx={{ color: "#8b949e" }}>Cancel</Button>
              <Button onClick={() => setStep("select")} variant="contained" sx={{ bgcolor: "#21262d", "&:hover": { bgcolor: "#30363d" } }}>
                Try Again
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" sx={{ bgcolor: "#238636" }}>Copied!</Alert>
      </Snackbar>
    </Dialog>
  );
};

export default CryptoPaymentModal;
