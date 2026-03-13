import { useState } from "react";

// useForm  → manages all form state (values, errors, submit state)
// FormProvider → shares the form with child components (Step1, Step2)
import { useForm, FormProvider } from "react-hook-form";

// zodResolver → connects our Zod validation schema to react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";

// Animation library for smooth page transitions
import { AnimatePresence, motion } from "framer-motion";

// Icons
import { ArrowRight, ArrowLeft, CheckCircle2, Boxes, AlertCircle } from "lucide-react";

// Our pre-configured API client (axios wrapper)
import api from "../lib/api";

// Zod validation schemas and TypeScript types
import {
    registerSchema,   // combined schema: owner + market
    ownerSchema,      // step 1 fields only
    marketSchema,     // step 2 fields only
    type RegisterFormData,
} from "../schemas/register.schema";

// The two form steps (each is its own component)
import Step1Owner from "../components/register/Step1Owner";
import Step2Market from "../components/register/Step2Market";
import Button from "../components/ui/Button";

// ─── Step metadata (used to render the step indicator at the top) ───
const STEPS = [
    { id: 1, label: "Your Details", description: "Personal info" },
    { id: 2, label: "Business Info", description: "Company setup" },
];

// ─── Main Register Page ───────────────────────────────────────────────
export default function Register() {

    // Which step are we on? Starts at 1.
    const [currentStep, setCurrentStep] = useState(1);

    // After the form is submitted, we show a success or error banner.
    // null  → no banner yet
    // { type: "success" | "error", message: string } → show a banner
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    // ─── Set up the single form that covers BOTH steps ───────────────
    // All fields live here. react-hook-form keeps track of everything.
    const methods = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema), // validate with Zod
        mode: "onTouched",                     // show errors after user touches a field
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

    // Pull out the helpers we need from the form
    const {
        handleSubmit,                      // wraps our submit function with validation
        trigger,                           // manually trigger validation for specific fields
        formState: { isSubmitting },       // true while the API call is in progress
    } = methods;

    // ─── "Continue" button on Step 1 ─────────────────────────────────
    // Before moving to Step 2 we validate ONLY the Step 1 fields.
    const handleNext = async () => {

        // Get the list of field names that belong to Step 1:
        // ["owner.name", "owner.username", "owner.email", ...]
        const step1FieldNames = Object.keys(ownerSchema.shape).map(
            (key) => `owner.${key}` as const
        );

        // Ask react-hook-form to validate those fields right now.
        // Returns true if all pass, false if any fail.
        const allFieldsValid = await trigger(step1FieldNames as any);
        if (!allFieldsValid) return; // stop here, errors are already shown

        // The ownerSchema has a "refine" rule: password must equal confirmPassword.
        // react-hook-form's trigger() doesn't always catch cross-field refinements,
        // so we double-check manually using Zod directly.
        const ownerValues = methods.getValues("owner");
        const zodResult = ownerSchema.safeParse(ownerValues);

        if (!zodResult.success) {
            // If there are refinement errors, put them into the form manually
            zodResult.error.issues.forEach((issue) => {
                const fieldPath = issue.path.join(".");
                methods.setError(`owner.${fieldPath}` as any, {
                    type: "manual",
                    message: issue.message,
                });
            });
            return; // stop here
        }

        // All good — go to Step 2 and clear any old status banners
        setCurrentStep(2);
        setSubmitStatus(null);
    };

    // ─── "Back" button on Step 2 ─────────────────────────────────────
    const handleBack = () => {
        setCurrentStep(1);
        setSubmitStatus(null);
    };

    // ─── Final submit (called after Step 2 is validated) ─────────────
    const onSubmit = async (data: RegisterFormData) => {
        try {
            setSubmitStatus(null);

            // 1. Remove confirmPassword — the server doesn't need it
            const { confirmPassword: _ignored, ...ownerData } = data.owner;

            // 2. Remove empty optional market fields (e.g. "" → don't send them)
            const cleanMarket = Object.fromEntries(
                Object.entries(data.market).filter(([, value]) => value !== "")
            );

            // 3. Build the final payload
            const payload = {
                owner: ownerData,
                market: cleanMarket,
            };

            // 4. POST to the backend
            await api.post("/api/users/register", payload);

            // Show success banner
            setSubmitStatus({
                type: "success",
                message: "Registration successful! Your account and business have been created.",
            });

        } catch (err: any) {
            console.error("Registration failed:", err);

            // Try to get a meaningful error message from the server response,
            // fall back to the generic error message, or a default string.
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Something went wrong. Please try again.";

            setSubmitStatus({ type: "error", message });
        }
    };

    // ─── "Create Account" button on Step 2 ──────────────────────────
    // Validate Step 2 fields first, then run the full form submit.
    const handleStep2Submit = async () => {

        // Get field names for Step 2: ["market.market_name", "market.market_email", ...]
        const step2FieldNames = Object.keys(marketSchema.shape).map(
            (key) => `market.${key}` as const
        );

        // Validate those fields
        const allFieldsValid = await trigger(step2FieldNames as any);
        if (!allFieldsValid) return; // stop here, errors are shown

        // All Step 2 fields are valid. Now run the full submit with react-hook-form.
        // handleSubmit() will call onSubmit() with the complete form data.
        handleSubmit(onSubmit)();
    };

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div className="flex min-h-screen">

            {/* ══════════════════════════════════════════
                LEFT PANEL  — Branding (hidden on mobile)
                ══════════════════════════════════════════ */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-10 text-white relative overflow-hidden">

                {/* Decorative blurred circles in the background */}
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

                {/* Hero text + feature chips */}
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

            {/* ══════════════════════════════════════════
                RIGHT PANEL — The actual form
                ══════════════════════════════════════════ */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-12 lg:px-16">
                <div className="w-full max-w-lg">

                    {/* Mobile-only logo (the left panel is hidden on small screens) */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                            <Boxes className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-text-primary">InventoHub</span>
                    </div>

                    {/* ── Step Indicator (the numbered dots + connecting line) ── */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3">
                            {STEPS.map((step, index) => (
                                <div key={step.id} className="flex items-center gap-3 flex-1">

                                    {/* Circle dot + label */}
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300
                                                ${currentStep > step.id
                                                    ? "bg-success text-white shadow-md shadow-success/30"      // completed → green
                                                    : currentStep === step.id
                                                        ? "bg-primary-600 text-white shadow-md shadow-primary-500/30"  // active → blue
                                                        : "bg-gray-100 text-text-muted"                               // future → grey
                                                }`}
                                        >
                                            {/* Show a checkmark if the step is already completed */}
                                            {currentStep > step.id
                                                ? <CheckCircle2 className="h-4 w-4" />
                                                : step.id
                                            }
                                        </div>

                                        {/* Step label (hidden on very small screens) */}
                                        <div className="hidden sm:block">
                                            <p className={`text-sm font-semibold transition-colors ${currentStep >= step.id ? "text-text-primary" : "text-text-muted"}`}>
                                                {step.label}
                                            </p>
                                            <p className="text-xs text-text-muted">{step.description}</p>
                                        </div>
                                    </div>

                                    {/* Animated connector line between step 1 and step 2 */}
                                    {index < STEPS.length - 1 && (
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

                    {/* ── Success / Error Banner ── */}
                    {/* AnimatePresence lets the banner animate in and out smoothly */}
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
                                {submitStatus.type === "success"
                                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                                    : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                                }
                                <p>{submitStatus.message}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── The Form ── */}
                    {/*
                        FormProvider shares `methods` with Step1Owner and Step2Market
                        so they can register their own fields without us passing props.
                        e.preventDefault() stops the browser from doing a full page reload.
                    */}
                    <FormProvider {...methods}>
                        <form onSubmit={(e) => e.preventDefault()} noValidate>
                            <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-sm sm:p-8">

                                {/* Switch between Step 1 and Step 2 with an animation */}
                                <AnimatePresence mode="wait">
                                    {currentStep === 1
                                        ? <Step1Owner key="step1" />
                                        : <Step2Market key="step2" />
                                    }
                                </AnimatePresence>

                                {/* ── Navigation Buttons ── */}
                                <div className="mt-8 flex items-center justify-between gap-4">

                                    {/* Left side: "Back" button on Step 2, or an empty div on Step 1 */}
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
                                        <div /> // empty placeholder to keep the right button on the right
                                    )}

                                    {/* Right side: "Continue" on Step 1, "Create Account" on Step 2 */}
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

                    {/* ── "Already have an account?" link ── */}
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
