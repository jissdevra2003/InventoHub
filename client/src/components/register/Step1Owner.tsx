import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import {
    User,
    AtSign,
    Mail,
    Phone,
    Lock,
    ShieldCheck,
} from "lucide-react";
import Input from "../ui/Input";
import type { RegisterFormData } from "../../schemas/register.schema";

export default function Step1Owner() {
    const {
        register,
        formState: { errors },
    } = useFormContext<RegisterFormData>();

    const ownerErrors = errors.owner;

    const fields = [
        {
            name: "owner.name" as const,
            label: "Full Name",
            placeholder: "John Doe",
            icon: <User className="h-4 w-4" />,
            error: ownerErrors?.name?.message,
        },
        {
            name: "owner.username" as const,
            label: "Username",
            placeholder: "johndoe_123",
            icon: <AtSign className="h-4 w-4" />,
            error: ownerErrors?.username?.message,
        },
        {
            name: "owner.email" as const,
            label: "Email Address",
            placeholder: "john@example.com",
            type: "email",
            icon: <Mail className="h-4 w-4" />,
            error: ownerErrors?.email?.message,
        },
        {
            name: "owner.phone" as const,
            label: "Phone Number",
            placeholder: "+919876543210",
            icon: <Phone className="h-4 w-4" />,
            error: ownerErrors?.phone?.message,
        },
        {
            name: "owner.password" as const,
            label: "Password",
            placeholder: "••••••••",
            type: "password",
            icon: <Lock className="h-4 w-4" />,
            error: ownerErrors?.password?.message,
        },
        {
            name: "owner.confirmPassword" as const,
            label: "Confirm Password",
            placeholder: "••••••••",
            type: "password",
            icon: <ShieldCheck className="h-4 w-4" />,
            error: ownerErrors?.confirmPassword?.message,
        },
    ];

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
                    Create your account
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                    Start by setting up your personal details
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                    <div
                        key={field.name}
                        className={
                            field.name === "owner.email" ||
                                field.name === "owner.phone"
                                ? ""
                                : field.name === "owner.password" ||
                                    field.name === "owner.confirmPassword"
                                    ? ""
                                    : ""
                        }
                    >
                        <Input
                            {...register(field.name)}
                            label={field.label}
                            placeholder={field.placeholder}
                            type={field.type || "text"}
                            icon={field.icon}
                            error={field.error}
                            autoComplete={
                                field.type === "password" ? "new-password" : "off"
                            }
                        />
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
