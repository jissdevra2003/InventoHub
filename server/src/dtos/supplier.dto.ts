// DTO = Data Transfer Object
// Defines the shape of data accepted/returned by supplier controllers

export interface createSupplierDto {
    company_name: string;
    contact_name?: string;
    contact_number?: string;
    email?: string;

    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;

    gstin?: string;

    lead_time?: number;
    opening_balance?: number;
    credit_limit?: number;
    payment_terms?: string;
    supplier_type?: string;
    internal_notes?: string;
}

export interface updateSupplierDto {
    company_name?: string;
    contact_name?: string;
    contact_number?: string;
    email?: string;

    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;

    gstin?: string;

    lead_time?: number;
    credit_limit?: number;
    payment_terms?: string;
    supplier_type?: string;
    internal_notes?: string;
}
