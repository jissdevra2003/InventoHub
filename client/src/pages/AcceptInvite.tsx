import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, AlertCircle, CheckCircle2, User, AtSign, Lock, Eye, EyeOff } from "lucide-react";
import api from "../lib/api";
import BrandingPanel from "../components/auth/BrandingPanel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !username || !password || !confirmPassword) {
      setSubmitStatus({ type: "error", message: "All fields are required." });
      return;
    }
    if (password.length < 6) {
      setSubmitStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setSubmitStatus({ type: "error", message: "Passwords do not match." });
      return;
    }
    if (!token) {
      setSubmitStatus({ type: "error", message: "Invalid or missing invite token." });
      return;
    }

    setLoading(true);
    setSubmitStatus(null);

    try {
      await api.post("/api/users/accept-invite", {
        invite_token: token,
        name,
        username,
        password,
      });
      setSubmitStatus({ type: "success", message: "Account created! Redirecting to login…" });
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err: any) {
      setSubmitStatus({
        type: "error",
        message: err?.response?.data?.message || "Failed to accept invite. It may be expired.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* LEFT — Branding */}
      <BrandingPanel
        headline={
          <>
            You're invited to
            <br />
            <span className="bg-gradient-to-r from-primary-200 to-indigo-300 bg-clip-text text-transparent">
              InventoHub
            </span>
          </>
        }
        subtext="Set up your account to join your team. Manage inventory, track stock, and collaborate with your organization."
      />

      {/* RIGHT — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">InventoHub</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
              Accept Invitation
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Complete your account setup to join the team
            </p>
          </div>

          {/* Status banner */}
          <AnimatePresence mode="wait">
            {submitStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
                  submitStatus.type === "success"
                    ? "border-success/30 bg-success-light text-emerald-800"
                    : "border-error/30 bg-error-light text-red-800"
                }`}
              >
                {submitStatus.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                )}
                <p>{submitStatus.message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No token warning */}
          {!token && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error-light p-4 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <p>No invite token found. Please use the link from your invitation email.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">
              <div className="space-y-5">
                {/* Name */}
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  icon={<User className="h-4 w-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                {/* Username */}
                <Input
                  label="Username"
                  type="text"
                  placeholder="johndoe"
                  autoComplete="username"
                  icon={<AtSign className="h-4 w-4" />}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                {/* Password */}
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    icon={<Lock className="h-4 w-4" />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-text-muted transition-colors hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <Input
                  label="Confirm Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  icon={<Lock className="h-4 w-4" />}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="mt-8">
                <Button type="submit" loading={loading} className="w-full" disabled={!token}>
                  Create Account
                </Button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary-600 transition-colors hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
