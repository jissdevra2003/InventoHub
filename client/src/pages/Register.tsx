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

const STEPS = [
    { id: 1, label: "Your Details", description: "Personal info" },
    { id: 2, label: "Business Info", description: "Company setup" },
];

export default function Register() {
    const [currentStep, setCurrentStep] = useState(1);
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const methods = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: "onTouched",
        defaultValues: {
            owner: {
                name: "",
                username: "",
                email: "",
                phone: "",
                password: "",
                confirmPassword: "",
            },
            market: {
                market_name: "",
                market_email: "",
                market_phone: "",
                industryType: "",
                country: "",
                state: "",
                city: "",
                gstNumber: "",
                postal_code: "",
                address: "",
            },
        },
    });

    const {
        handleSubmit,
        trigger,
        formState: { isSubmitting },
    } = methods;

    // ─── Step Navigation ───
    const handleNext = async () => {
        // Validate only Step 1 fields before proceeding
        const step1Fields = ownerSchema.shape;
        const fieldNames = Object.keys(step1Fields).map(
            (key) => `owner.${key}` as const
        );

        // We need to validate the refinement too (confirmPassword match)
        const valid = await trigger(fieldNames as any);
        if (!valid) return;

        // Also check the refinement manually
        const ownerValues = methods.getValues("owner");
        const refineResult = ownerSchema.safeParse(ownerValues);
        if (!refineResult.success) {
            refineResult.error.issues.forEach((issue) => {
                const path = issue.path.join(".");
                methods.setError(`owner.${path}` as any, {
                    type: "manual",
                    message: issue.message,
                });
            });
            return;
        }

        setCurrentStep(2);
        setSubmitStatus(null);
    };

    const handleBack = () => {
        setCurrentStep(1);
        setSubmitStatus(null);
    };

    // ─── Submit ───
    const onSubmit = async (data: RegisterFormData) => {
        try {
            setSubmitStatus(null);

            // Strip confirmPassword before sending to API
            const { confirmPassword: _, ...ownerData } = data.owner;

            // Clean up empty optional strings from market data
            const cleanMarket = Object.fromEntries(
                Object.entries(data.market).filter(([, v]) => v !== "")
            );

            const payload = {
                owner: ownerData,
                market: cleanMarket,
            };

            await api.post("/api/users/register", payload);

            setSubmitStatus({
                type: "success",
                message:
                    "Registration successful! Your account and business have been created.",
            });
        } catch (err: any) {
            console.error("Registration failed:", err);
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Something went wrong. Please try again.";
            setSubmitStatus({ type: "error", message });
        }
    };

    // ─── Step 2 submit with validation ───
    const handleStep2Submit = async () => {
        const step2Fields = Object.keys(marketSchema.shape).map(
            (key) => `market.${key}` as const
        );

        const valid = await trigger(step2Fields as any);
        if (!valid) return;

        handleSubmit(onSubmit)();
    };

    return (
        <div className="flex min-h-screen">
            {/* ─── Left Branding Panel ─── */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-10 text-white relative overflow-hidden">
                {/* Background decorative circles */}
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
                        {["Multi-shop support", "Role-based access", "Real-time tracking"].map(
                            (feat) => (
                                <span
                                    key={feat}
                                    className="rounded-full border border-primary-600/40 bg-primary-800/40 px-4 py-1.5 text-xs font-medium text-primary-200 backdrop-blur-sm"
                                >
                                    {feat}
                                </span>
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 text-xs text-primary-400">
                    © {new Date().getFullYear()} InventoHub. All rights reserved.
                </div>
            </div>

            {/* ─── Right Form Panel ─── */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
                <div className="w-full max-w-lg">
                    {/* Mobile logo */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-text-primary">InventoHub</span>
                    </div>

                    {/* ─── Step Indicator ─── */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            {STEPS.map((step, index) => (
                                <div key={step.id} className="flex items-center gap-3 flex-1">
                                    {/* Step dot + label */}
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300
                        ${currentStep > step.id
                                                    ? "bg-success text-white shadow-md shadow-success/30"
                                                    : currentStep === step.id
                                                        ? "bg-primary-600 text-white shadow-md shadow-primary-500/30"
                                                        : "bg-gray-100 text-text-muted"
                                                }
                      `}
                                        >
                                            {currentStep > step.id ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                step.id
                                            )}
                                        </div>
                                        <div className="hidden sm:block">
                                            <p
                                                className={`text-sm font-semibold transition-colors ${currentStep >= step.id
                                                    ? "text-text-primary"
                                                    : "text-text-muted"
                                                    }`}
                                            >
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Connector line */}
                                    {index < STEPS.length - 1 && (
                                        <div className="flex-1">
                                            <div className="h-0.5 w-full rounded-full bg-gray-200">
                                                <motion.div
                                                    className="h-full rounded-full bg-primary-500"
                                                    initial={{ width: "0%" }}
                                                    animate={{
                                                        width: currentStep > step.id ? "100%" : "0%",
                                                    }}
                                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Status Messages ─── */}
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

                    {/* ─── Form ─── */}
                    <FormProvider {...methods}>
                        <form onSubmit={(e) => e.preventDefault()} noValidate>
                            <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">
                                <AnimatePresence mode="wait">
                                    {currentStep === 1 ? (
                                        <Step1Owner key="step1" />
                                    ) : (
                                        <Step2Market key="step2" />
                                    )}
                                </AnimatePresence>

                                {/* ─── Navigation Buttons ─── */}
                                <div className="mt-8 flex items-center justify-between gap-4">
                                    {currentStep === 2 ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleBack}
                                            icon={<ArrowLeft className="h-4 w-4" />}
                                        >
                                            Back
                                        </Button>
                                    ) : (
                                        <div />
                                    )}

                                    {currentStep === 1 ? (
                                        <Button
                                            type="button"
                                            onClick={handleNext}
                                            icon={<ArrowRight className="h-4 w-4" />}
                                        >
                                            Continue
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={handleStep2Submit}
                                            loading={isSubmitting}
                                        >
                                            Create Account
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </FormProvider>

                    {/* ─── Footer link ─── */}
                    <p className="mt-6 text-center text-sm text-text-secondary">
                        Already have an account?{" "}
                        <a
                            href="/login"
                            className="font-semibold text-primary-600 hover:text-primary-700 transition-colors"
                        >
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
