import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Boxes, AlertCircle, CheckCircle2, Mail, Lock, Eye, EyeOff } from "lucide-react";

import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import useAuthStore from "../stores/authStore";
import BrandingPanel from "../components/auth/BrandingPanel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";


// ────────────────────────────────────────────────────────
// LOGIN PAGE
// ────────────────────────────────────────────────────────
// Dual-panel layout matching the Register page:
//   Left  → BrandingPanel (desktop only)
//   Right → Email + Password form

export default function Login() {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);

    // ── Local state ──
    const [showPassword, setShowPassword] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // ── Form ──
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onTouched",
        defaultValues: { email: "", password: "" },
    });

    // ── Submit handler ──
    async function onSubmit(data: LoginFormData) {
        try {
            setSubmitStatus(null);
            await login(data.email, data.password);
            setSubmitStatus({ type: "success", message: "Login successful! Redirecting…" });

            // Short delay so the user sees the success message
            setTimeout(() => navigate("/dashboard", { replace: true }), 600);
        } catch (err: any) {
            setSubmitStatus({
                type: "error",
                message:
                    err?.response?.data?.message ||
                    err?.message ||
                    "Invalid credentials. Please try again.",
            });
        }
    }

    // ── Render ──
    return (
        <div className="flex min-h-screen">

            {/* LEFT — Branding (desktop only) */}
            <BrandingPanel
                headline={
                    <>
                        Welcome back to
                        <br />
                        <span className="bg-gradient-to-r from-primary-200 to-indigo-300 bg-clip-text text-transparent">
                            InventoHub
                        </span>
                    </>
                }
                subtext="Sign in to your account to continue managing your inventory, tracking stock levels, and growing your business."
            />

            {/* RIGHT — Login form */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
                <div className="w-full max-w-md">

                    {/* Mobile-only logo */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-text-primary">InventoHub</span>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
                            Sign in
                        </h2>
                        <p className="mt-2 text-sm text-text-secondary">
                            Enter your credentials to access your dashboard
                        </p>
                    </div>

                    {/* Status banner */}
                    <AnimatePresence mode="wait">
                        {submitStatus && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${submitStatus.type === "success"
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

                    {/* Form card */}
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">

                            <div className="space-y-5">
                                {/* Email */}
                                <Input
                                    label="Email address"
                                    type="email"
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    icon={<Mail className="h-4 w-4" />}
                                    error={errors.email?.message}
                                    {...register("email")}
                                />

                                {/* Password */}
                                <div>
                                    <div className="relative">
                                        <Input
                                            label="Password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                            icon={<Lock className="h-4 w-4" />}
                                            error={errors.password?.message}
                                            {...register("password")}
                                        />
                                        {/* Toggle visibility */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-[38px] text-text-muted transition-colors hover:text-text-secondary"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Forgot password link */}
                                    <div className="mt-2 text-right">
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Sign In button */}
                            <div className="mt-8">
                                <Button
                                    type="submit"
                                    loading={isSubmitting}
                                    className="w-full"
                                >
                                    Sign In
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Register link */}
                    <p className="mt-6 text-center text-sm text-text-secondary">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
