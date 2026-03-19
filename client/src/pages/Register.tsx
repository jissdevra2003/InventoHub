import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Boxes, AlertCircle } from "lucide-react";

import api from "../lib/api";
import {
    registerSchema,
    ownerSchema,
    marketSchema,
    type RegisterFormData,
} from "../schemas/register.schema";

import Step1Owner from "../components/register/Step1Owner";
import Step2Market from "../components/register/Step2Market";
import Button from "../components/ui/Button";


// ────────────────────────────────────────────────────────
// SMALL HELPER COMPONENTS (keep this file easy to scan)
// ────────────────────────────────────────────────────────

/** Left-side branding panel (only visible on large screens). */
function BrandingPanel() {
    return (
        <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-10 text-white relative overflow-hidden">

            {/* Decorative blurs */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-700/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-primary-600/15 blur-2xl" />

            {/* Logo */}
            <div className="relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                        <Boxes className="h-6 w-6 text-primary-200" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">InventoHub</span>
                </div>
            </div>

            {/* Hero text */}
            <div className="relative z-10 space-y-6">
                <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                    Manage your
                    <br />
                    <span className="bg-gradient-to-r from-primary-200 to-indigo-300 bg-clip-text text-transparent">
                        inventory smarter
                    </span>
                </h1>
                <p className="max-w-sm text-base leading-relaxed text-primary-200/80">
                    Join thousands of businesses that trust InventoHub to streamline
                    their stock management, from small shops to large enterprises.
                </p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-3 pt-2">
                    {["Multi-shop support", "Role-based access", "Real-time tracking"].map((feat) => (
                        <span
                            key={feat}
                            className="rounded-full border border-primary-600/40 bg-primary-800/40 px-4 py-1.5 text-xs font-medium text-primary-200 backdrop-blur-sm"
                        >
                            {feat}
                        </span>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="relative z-10 text-xs text-primary-400">
                © {new Date().getFullYear()} InventoHub. All rights reserved.
            </div>
        </div>
    );
}


/** The 2-dot step indicator at the top of the form. */
function StepIndicator({ currentStep }: { currentStep: number }) {
    const steps = [
        { id: 1, label: "Your Details", description: "Personal info" },
        { id: 2, label: "Business Info", description: "Company setup" },
    ];

    return (
        <div className="mb-8">
            <div className="flex items-center gap-3">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3 flex-1">

                        {/* Circle + label */}
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

                        {/* Animated connector line (only between the two dots) */}
                        {index < steps.length - 1 && (
                            <div className="flex-1">
                                <div className="h-0.5 w-full rounded-full bg-gray-200">
                                    <motion.div
                                        className="h-full rounded-full bg-primary-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: currentStep > step.id ? "100%" : "0%" }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


/** Success / error banner shown after form submission. */
function StatusBanner({ status }: { status: { type: "success" | "error"; message: string } }) {
    const isSuccess = status.type === "success";

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${isSuccess
                    ? "border-success/30 bg-success-light text-emerald-800"
                    : "border-error/30 bg-error-light text-red-800"
                }`}
        >
            {isSuccess
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            }
            <p>{status.message}</p>
        </motion.div>
    );
}


// ────────────────────────────────────────────────────────
// MAIN REGISTER PAGE
// ────────────────────────────────────────────────────────

export default function Register() {

    // ── State ──
    const [currentStep, setCurrentStep] = useState(1);
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);


    // ── Form Setup ──
    // One form covers BOTH steps. react-hook-form tracks all fields.
    const methods = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: "onTouched",
        defaultValues: {
            owner: { name: "", username: "", email: "", phone: "", password: "", confirmPassword: "" },
            market: { market_name: "", market_email: "", market_phone: "", industryType: "", country: "", state: "", city: "", gstNumber: "", postal_code: "", address: "" },
        },
    });

    const { handleSubmit, trigger, formState: { isSubmitting } } = methods;


    // ── Handlers ──

    // "Continue" button — validate Step 1 fields, then move to Step 2
    async function goToStep2() {
        // 1. Validate each owner field individually
        const fieldNames = Object.keys(ownerSchema.shape).map((key) => `owner.${key}` as const);
        const fieldsOk = await trigger(fieldNames as any);
        if (!fieldsOk) return;

        // 2. Double-check the "passwords must match" rule (cross-field refinement)
        //    trigger() sometimes misses .refine() rules, so we run Zod manually
        const ownerValues = methods.getValues("owner");
        const zodCheck = ownerSchema.safeParse(ownerValues);

        if (!zodCheck.success) {
            zodCheck.error.issues.forEach((issue) => {
                methods.setError(`owner.${issue.path.join(".")}` as any, {
                    type: "manual",
                    message: issue.message,
                });
            });
            return;
        }

        // All good — advance
        setCurrentStep(2);
        setSubmitStatus(null);
    }

    // "Back" button — go back to Step 1
    function goToStep1() {
        setCurrentStep(1);
        setSubmitStatus(null);
    }

    // "Create Account" button — validate Step 2 fields, then submit
    async function handleCreateAccount() {
        const fieldNames = Object.keys(marketSchema.shape).map((key) => `market.${key}` as const);
        const fieldsOk = await trigger(fieldNames as any);
        if (!fieldsOk) return;

        // All Step 2 fields valid → run the full form submit
        handleSubmit(submitRegistration)();
    }

    // The actual registration API calls (two-step flow)
    async function submitRegistration(data: RegisterFormData) {
        try {
            setSubmitStatus(null);

            // Strip confirmPassword — the server doesn't need it
            const { confirmPassword: _, ...ownerData } = data.owner;

            // Remove empty optional market fields (e.g. "" → don't send them)
            const marketData = Object.fromEntries(
                Object.entries(data.market).filter(([, v]) => v !== "")
            );

            // API Call 1 → Register company, get a temporary token back
            const companyRes = await api.post("/api/auth/register/company", marketData);
            const tempToken = companyRes.data.data.tempToken;

            // API Call 2 → Register user with that temp token
            await api.post("/api/auth/register/user", { ...ownerData, tempToken });

            setSubmitStatus({
                type: "success",
                message: "Registration successful! Your account and business have been created.",
            });

        } catch (err: any) {
            console.error("Registration failed:", err);
            setSubmitStatus({
                type: "error",
                message: err?.response?.data?.message || err?.message || "Something went wrong. Please try again.",
            });
        }
    }


    // ── Render ──
    return (
        <div className="flex min-h-screen">

            {/* LEFT — Branding (desktop only) */}
            <BrandingPanel />

            {/* RIGHT — The registration form */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
                <div className="w-full max-w-lg">

                    {/* Mobile-only logo */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-text-primary">InventoHub</span>
                    </div>

                    {/* Step dots (1 ── 2) */}
                    <StepIndicator currentStep={currentStep} />

                    {/* Success / Error banner */}
                    <AnimatePresence mode="wait">
                        {submitStatus && <StatusBanner status={submitStatus} />}
                    </AnimatePresence>

                    {/* The form itself */}
                    <FormProvider {...methods}>
                        <form onSubmit={(e) => e.preventDefault()} noValidate>
                            <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">

                                {/* Animated step switch */}
                                <AnimatePresence mode="wait">
                                    {currentStep === 1
                                        ? <Step1Owner key="step1" />
                                        : <Step2Market key="step2" />
                                    }
                                </AnimatePresence>

                                {/* Navigation buttons */}
                                <div className="mt-8 flex items-center justify-between gap-4">

                                    {/* Left: Back (only on Step 2) */}
                                    {currentStep === 2 ? (
                                        <Button type="button" variant="ghost" onClick={goToStep1} icon={<ArrowLeft className="h-4 w-4" />}>
                                            Back
                                        </Button>
                                    ) : (
                                        <div /> /* spacer */
                                    )}

                                    {/* Right: Continue or Create Account */}
                                    {currentStep === 1 ? (
                                        <Button type="button" onClick={goToStep2} icon={<ArrowRight className="h-4 w-4" />}>
                                            Continue
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={handleCreateAccount} loading={isSubmitting}>
                                            Create Account
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </FormProvider>

                    {/* Sign-in link */}
                    <p className="mt-6 text-center text-sm text-text-secondary">
                        Already have an account?{" "}
                        <a href="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
