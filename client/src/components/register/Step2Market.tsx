import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import {
    Building2,
    Mail,
    Phone,
    Factory,
    Globe,
    MapPin,
    Hash,
    Home,
} from "lucide-react";
import Input from "../ui/Input";
import type { RegisterFormData } from "../../schemas/register.schema";

export default function Step2Market() {
    const {
        register,
        formState: { errors },
    } = useFormContext<RegisterFormData>();

    const marketErrors = errors.market;

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-4"
        >
            <div>
                <h2 className="text-xl font-bold text-text-primary">
                    Set up your business
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                    Tell us about your organization
                </p>
            </div>

            {/* ─── Required Fields ─── */}
            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    {...register("market.market_name")}
                    label="Business Name"
                    placeholder="Acme Traders"
                    icon={<Building2 className="h-4 w-4" />}
                    error={marketErrors?.market_name?.message}
                />
                <Input
                    {...register("market.market_email")}
                    label="Business Email"
                    placeholder="contact@acme.com"
                    type="email"
                    icon={<Mail className="h-4 w-4" />}
                    error={marketErrors?.market_email?.message}
                />
                <Input
                    {...register("market.market_phone")}
                    label="Business Phone"
                    placeholder="+919876543210"
                    icon={<Phone className="h-4 w-4" />}
                    error={marketErrors?.market_phone?.message}
                />
                <Input
                    {...register("market.industryType")}
                    label="Industry Type"
                    placeholder="Retail, Wholesale, etc."
                    icon={<Factory className="h-4 w-4" />}
                    error={marketErrors?.industryType?.message}
                />
            </div>

            {/* ─── Optional Fields ─── */}
            <div className="pt-2">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                    Optional Details
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Input
                        {...register("market.country")}
                        label="Country"
                        placeholder="India"
                        icon={<Globe className="h-4 w-4" />}
                        error={marketErrors?.country?.message}
                    />
                    <Input
                        {...register("market.state")}
                        label="State"
                        placeholder="Maharashtra"
                        icon={<MapPin className="h-4 w-4" />}
                        error={marketErrors?.state?.message}
                    />
                    <Input
                        {...register("market.city")}
                        label="City"
                        placeholder="Mumbai"
                        icon={<MapPin className="h-4 w-4" />}
                        error={marketErrors?.city?.message}
                    />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <Input
                        {...register("market.gstNumber")}
                        label="GST Number"
                        placeholder="22AAAAA0000A1Z5"
                        icon={<Hash className="h-4 w-4" />}
                        error={marketErrors?.gstNumber?.message}
                    />
                    <Input
                        {...register("market.postal_code")}
                        label="Postal Code"
                        placeholder="400001"
                        icon={<Hash className="h-4 w-4" />}
                        error={marketErrors?.postal_code?.message}
                    />
                    <Input
                        {...register("market.address")}
                        label="Address"
                        placeholder="123 Main Street"
                        icon={<Home className="h-4 w-4" />}
                        error={marketErrors?.address?.message}
                    />
                </div>
            </div>
        </motion.div>
    );
}
