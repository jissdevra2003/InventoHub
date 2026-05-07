import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
    Boxes,
    AlertCircle,
    CheckCircle2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowLeft,
    ShieldCheck,
} from "lucide-react";

import api from "../lib/api";
import {
    emailStepSchema,
    otpStepSchema,
    newPasswordSchema,
    type EmailStepData,
    type OtpStepData,
    type NewPasswordData,
} from "../schemas/forgotPassword.schema";

import BrandingPanel from "../components/auth/BrandingPanel";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";


// ────────────────────────────────────────────────────────
// STEP INDICATOR
// ────────────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
    const steps = [
        { id: 1, label: "Email", description: "Verify identity" },
        { id: 2, label: "OTP", description: "Enter code" },
        { id: 3, label: "Password", description: "Set new" },
    ];

    return (
        <div className="mb-8">
            <div className="flex items-center gap-3">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2.5">
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300
                                    ${currentStep > step.id
                                        ? "bg-success text-white shadow-md shadow-success/30"
                                        : currentStep === step.id
                                            ? "bg-primary-600 text-white shadow-md shadow-primary-500/30"
                                            : "bg-gray-100 text-text-muted"
                                    }`}
                            >
                                {currentStep > step.id
                                    ? <CheckCircle2 className="h-4 w-4" />
                                    : step.id
                                }
                            </div>
                            <div className="hidden sm:block">
                                <p className={`text-sm font-semibold transition-colors ${currentStep >= step.id ? "text-text-primary" : "text-text-muted"}`}>
                                    {step.label}
                                </p>
                                <p className="text-xs text-text-muted">{step.description}</p>
                            </div>
                        </div>

                        {index < steps.length - 1 && (
                            <div
                                className={`hidden sm:block h-px flex-1 transition-colors duration-300 ${currentStep > step.id ? "bg-success" : "bg-border"
                                    }`}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


// ────────────────────────────────────────────────────────
// OTP INPUT (6 individual digit boxes)
// ────────────────────────────────────────────────────────

function OtpInput({
    value,
    onChange,
    error,
}: {
    value: string;
    onChange: (val: string) => void;
    error?: string;
}) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

    const handleChange = (index: number, char: string) => {
        if (!/^\d?$/.test(char)) return;
        const newDigits = [...digits];
        newDigits[index] = char;
        onChange(newDigits.join(""));
        if (char && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted) {
            onChange(pasted);
            const focusIndex = Math.min(pasted.length, 5);
            inputRefs.current[focusIndex]?.focus();
        }
    };

    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">
                Enter OTP
            </label>
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className={`h-14 w-12 rounded-xl border text-center text-xl font-bold
                            transition-all duration-200 outline-none
                            ${error
                                ? "border-error bg-error-light text-error"
                                : "border-border bg-surface text-text-primary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                            }`}
                        aria-label={`OTP digit ${i + 1}`}
                    />
                ))}
            </div>
            {error && (
                <p className="mt-2 text-sm text-error text-center">{error}</p>
            )}
        </div>
    );
}


// ────────────────────────────────────────────────────────
// MAIN FORGOT PASSWORD PAGE
// ────────────────────────────────────────────────────────

export default function ForgotPassword() {
    const navigate = useNavigate();

    // ── Shared state ──
    const [currentStep, setCurrentStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // Resend cooldown
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // ── Password visibility ──
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── Step 1: Email form ──
    const emailForm = useForm<EmailStepData>({
        resolver: zodResolver(emailStepSchema),
        mode: "onTouched",
        defaultValues: { email: "" },
    });

    // ── Step 3: Password form ──
    const passwordForm = useForm<NewPasswordData>({
        resolver: zodResolver(newPasswordSchema),
        mode: "onTouched",
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    // ── OTP validation ──
    const [otpError, setOtpError] = useState<string | undefined>();

    // ── Handlers ──

    const sendOtp = useCallback(async (emailVal: string) => {
        setIsLoading(true);
        setSubmitStatus(null);
        try {
            await api.post("/api/auth/forgot-password", { email: emailVal });
            setEmail(emailVal);
            setCurrentStep(2);
            setResendCooldown(60);
            setSubmitStatus({
                type: "success",
                message: "OTP has been sent to your email address.",
            });
        } catch (err: any) {
            setSubmitStatus({
                type: "error",
                message: err?.response?.data?.message || "Failed to send OTP. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    async function handleEmailSubmit(data: EmailStepData) {
        await sendOtp(data.email);
    }

    async function handleResend() {
        if (resendCooldown > 0) return;
        await sendOtp(email);
    }

    async function handleOtpSubmit() {
        // Client-side format check
        const result = otpStepSchema.safeParse({ otp });
        if (!result.success) {
            setOtpError(result.error.issues[0].message);
            return;
        }
        setOtpError(undefined);
        setSubmitStatus(null);

        // Server-side OTP verification before advancing
        setIsLoading(true);
        try {
            await api.post("/api/auth/verify-otp", { email, otp });
            setCurrentStep(3);
        } catch (err: any) {
            setOtpError(
                err?.response?.data?.message || "Invalid or expired OTP. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function handlePasswordSubmit(data: NewPasswordData) {
        setIsLoading(true);
        setSubmitStatus(null);
        try {
            await api.post("/api/auth/reset-password", {
                email,
                otp,
                newPassword: data.newPassword,
                confirmPassword: data.confirmPassword,
            });
            setSubmitStatus({
                type: "success",
                message: "Password reset successfully! Redirecting to login…",
            });
            setTimeout(() => navigate("/login", { replace: true }), 1500);
        } catch (err: any) {
            setSubmitStatus({
                type: "error",
                message: err?.response?.data?.message || "Failed to reset password. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    // ── Slide animation variants ──
    const slideVariants = {
        enter: { opacity: 0, x: 30 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -30 },
    };

    // ── Render ──
    return (
        <div className="flex min-h-screen">

            {/* LEFT — Branding */}
            <BrandingPanel
                headline={
                    <>
                        Reset your
                        <br />
                        <span className="bg-gradient-to-r from-primary-200 to-indigo-300 bg-clip-text text-transparent">
                            password
                        </span>
                    </>
                }
                subtext="Don't worry, it happens to the best of us. We'll send a verification code to your email to help you regain access."
            />

            {/* RIGHT — Form */}
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
                    <div className="mb-2">
                        <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
                            Forgot Password
                        </h2>
                        <p className="mt-2 text-sm text-text-secondary">
                            {currentStep === 1 && "Enter your email to receive a verification code"}
                            {currentStep === 2 && "Enter the 6-digit code sent to your email"}
                            {currentStep === 3 && "Create a strong new password for your account"}
                        </p>
                    </div>

                    {/* Step indicator */}
                    <StepIndicator currentStep={currentStep} />

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
                    <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">
                        <AnimatePresence mode="wait">

                            {/* ── STEP 1: Email ── */}
                            {currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} noValidate>
                                        <div className="space-y-5">
                                            <Input
                                                label="Email address"
                                                type="email"
                                                placeholder="you@example.com"
                                                autoComplete="email"
                                                icon={<Mail className="h-4 w-4" />}
                                                error={emailForm.formState.errors.email?.message}
                                                {...emailForm.register("email")}
                                            />
                                        </div>
                                        <div className="mt-8">
                                            <Button
                                                type="submit"
                                                loading={isLoading}
                                                className="w-full"
                                                id="send-otp-button"
                                            >
                                                Send OTP
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}

                            {/* ── STEP 2: OTP ── */}
                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <div className="space-y-6">
                                        {/* Email hint */}
                                        <div className="flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-100 px-4 py-3">
                                            <ShieldCheck className="h-4 w-4 text-primary-600 shrink-0" />
                                            <p className="text-sm text-primary-700">
                                                Code sent to <span className="font-semibold">{email}</span>
                                            </p>
                                        </div>

                                        <OtpInput
                                            value={otp}
                                            onChange={(val) => {
                                                setOtp(val);
                                                if (otpError) setOtpError(undefined);
                                            }}
                                            error={otpError}
                                        />

                                        {/* Resend */}
                                        <div className="text-center">
                                            {resendCooldown > 0 ? (
                                                <p className="text-sm text-text-muted">
                                                    Resend code in <span className="font-semibold text-primary-600">{resendCooldown}s</span>
                                                </p>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResend}
                                                    className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
                                                    id="resend-otp-button"
                                                >
                                                    Didn't receive the code? Resend
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex gap-3">
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setCurrentStep(1);
                                                setSubmitStatus(null);
                                            }}
                                            className="flex-1"
                                            icon={<ArrowLeft className="h-4 w-4" />}
                                            style={{ background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={handleOtpSubmit}
                                            className="flex-[2]"
                                            id="verify-otp-button"
                                        >
                                            Verify OTP
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── STEP 3: New Password ── */}
                            {currentStep === 3 && (
                                <motion.div
                                    key="step3"
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25 }}
                                >
                                    <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} noValidate>
                                        <div className="space-y-5">
                                            {/* New Password */}
                                            <div className="relative">
                                                <Input
                                                    label="New Password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    icon={<Lock className="h-4 w-4" />}
                                                    error={passwordForm.formState.errors.newPassword?.message}
                                                    {...passwordForm.register("newPassword")}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-[38px] text-text-muted transition-colors hover:text-text-secondary"
                                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>

                                            {/* Confirm Password */}
                                            <div className="relative">
                                                <Input
                                                    label="Confirm Password"
                                                    type={showConfirm ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    icon={<Lock className="h-4 w-4" />}
                                                    error={passwordForm.formState.errors.confirmPassword?.message}
                                                    {...passwordForm.register("confirmPassword")}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(!showConfirm)}
                                                    className="absolute right-3 top-[38px] text-text-muted transition-colors hover:text-text-secondary"
                                                    aria-label={showConfirm ? "Hide password" : "Show password"}
                                                >
                                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <Button
                                                type="submit"
                                                loading={isLoading}
                                                className="w-full"
                                                id="reset-password-button"
                                            >
                                                Reset Password
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Back to login link */}
                    <p className="mt-6 text-center text-sm text-text-secondary">
                        Remember your password?{" "}
                        <Link
                            to="/login"
                            className="font-semibold text-primary-600 transition-colors hover:text-primary-700"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
