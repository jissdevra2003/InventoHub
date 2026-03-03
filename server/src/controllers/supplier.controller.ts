import { Request, Response } from "express";
import { Types } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { Supplier } from "../models/Supplier.model";
import { createSupplierValidator, updateSupplierValidator } from "../validators/supplier.validator";
import { createSupplierDto, updateSupplierDto } from "../dtos/supplier.dto";


// ─── 1. Create Supplier ───────────────────────────────────────────────────────
// Only users with permission can add a supplier to their market
export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    // Validate incoming data
    const result = createSupplierValidator.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
        throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
    }

    const data: createSupplierDto = result.data;

    if (!data.email && !data.contact_number) {
        throw new ApiError(400, "At least one contact method (email or contact number) is required");
    }

    // Prevent duplicate supplier in the same market (by email or phone)
    const duplicate = await Supplier.findOne({
        market_id: user.marketId,
        isActive: true, // only consider active suppliers for duplication check
        $or: [
            ...(data.email ? [{ email: data.email }] : []),
            ...(data.contact_number ? [{ contact_number: data.contact_number }] : []),
        ],
    });

    if (duplicate) {
        throw new ApiError(409, "A supplier with this email or contact number already exists");
    }

    // Create supplier — market_id and createdBy come from the logged-in user
    const supplier = await Supplier.create({
        ...data,
        market_id: user.marketId,
        createdBy: user.userId,
        // outstanding_balance starts as the opening balance (unpaid debt from before)
        outstanding_balance: data.opening_balance ?? 0,
    });

    return res.status(201).json(
        new ApiResponse(201, "Supplier created successfully", {
            id: supplier._id,
            company_name: supplier.company_name,
            contact_name: supplier.contact_name,
            contact_number: supplier.contact_number,
            email: supplier.email,
            supplier_type: supplier.supplier_type,
            outstanding_balance: supplier.outstanding_balance,
        })
    );
});


// ─── 2. List Suppliers ────────────────────────────────────────────────────────
// Returns paginated list of active suppliers in the user's market
// Supports search by company_name via ?search=xyz
export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    // Build filter
    const filter: any = {
        market_id: user.marketId,
        isActive: true,
    };

    // If user typed a search term, match company_name (case-insensitive)
    if (search) {
        filter.company_name = { $regex: search, $options: "i" };
    }

    // Run both queries in parallel for performance
    const [suppliers, total] = await Promise.all([
        Supplier.find(filter)
            .select("company_name contact_name contact_number email supplier_type outstanding_balance lead_time createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Supplier.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
        new ApiResponse(200, "Suppliers fetched successfully", {
            suppliers,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        })
    );
});


// ─── 3. Get Supplier By ID ────────────────────────────────────────────────────
// Returns full details of a single supplier (market-isolated)
export const getSupplierById = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({
        _id: supplierId,
        market_id: user.marketId, // ensures you can only view your own market's suppliers
        isActive: true,
    }).select("-__v");

    if (!supplier) {
        throw new ApiError(404, "Supplier not found");
    }

    return res.status(200).json(
        new ApiResponse(200, "Supplier fetched successfully", supplier)
    );
});


// ─── 4. Update Supplier ───────────────────────────────────────────────────────
// Allows editing contact/address/terms — NOT outstanding_balance (managed by orders)
export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    const { supplierId } = req.params;

    // Validate incoming data
    const result = updateSupplierValidator.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`);
        throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
    }

    const updates: updateSupplierDto = result.data;

    if (Object.keys(updates).length === 0) {
        throw new ApiError(400, "No fields provided to update");
    }

    // Find supplier (market-isolated)
    const supplier = await Supplier.findOne({
        _id: supplierId,
        market_id: user.marketId,
        isActive: true,
    });

    if (!supplier) {
        throw new ApiError(404, "Supplier not found");
    }

    // Check duplicate email/phone (ignore the current supplier itself)
    if (updates.email || updates.contact_number) {
        const duplicate = await Supplier.findOne({
            market_id: user.marketId,
            isActive: true,
            _id: { $ne: supplierId }, // exclude current supplier
            $or: [
                ...(updates.email ? [{ email: updates.email }] : []),
                ...(updates.contact_number ? [{ contact_number: updates.contact_number }] : []),
            ],
        });

        if (duplicate) {
            throw new ApiError(409, "Another supplier with this email or contact number already exists");
        }
    }

    // Apply updates
    Object.assign(supplier, updates);
    await supplier.save();

    return res.status(200).json(
        new ApiResponse(200, "Supplier updated successfully", {
            id: supplier._id,
            company_name: supplier.company_name,
            updatedAt: supplier.updatedAt,
        })
    );
});


// ─── 5. Delete Supplier (Soft Delete) ────────────────────────────────────────
// Marks supplier as inactive — does NOT delete history or past bills
export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    // Common match stage reused across aggregations
    const matchStage = {
        $match: {
            market_id: new Types.ObjectId(user.marketId),
            isActive: true,
        },
    };

    const { supplierId } = req.params;

    const supplier = await Supplier.findOne({
        _id: supplierId,
        market_id: user.marketId,
        isActive: true,
    });

    if (!supplier) {
        throw new ApiError(404, "Supplier not found or already deleted");
    }

    // Block deletion if there is money still owed
    if (supplier.outstanding_balance && supplier.outstanding_balance > 0) {
        throw new ApiError(400, `Cannot delete supplier with outstanding balance of ₹${supplier.outstanding_balance}`);
    }

    supplier.isActive = false;
    await supplier.save();

    return res.status(200).json(
        new ApiResponse(200, "Supplier deleted successfully")
    );
});


// ─── 6. Get Supplier Analytics (Dashboard) ────────────────────────────────────
// ONE endpoint that returns all 5 analytics sections for the supplier dashboard.
// All aggregations run in parallel with Promise.all for best performance.
// Each section is clearly labelled with what frontend component to use.
export const getSupplierAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw new ApiError(401, "Unauthorized");

    // Common MongoDB match stage: only active suppliers in this market
    const matchStage = {
        $match: {
            market_id: new Types.ObjectId(user.marketId),
            isActive: true,
        },
    };

    const [
        financialSummary,
        debtConcentration,
        purchaseLoyalty,
        supplyChainMix,
        leadTimeBenchmark,
    ] = await Promise.all([

        // ── SECTION 1: Financial Summary ──────────────────────────────────────
        // FRONTEND → 3 "Highlight Cards" at top of dashboard
        //   Card 1: "Total Purchased"   — total money ever spent across all suppliers
        //   Card 2: "Total Paid"        — money already paid out
        //   Card 3: "Total Outstanding" — money still owed (show in red if > 0)
        //   Card 4: "Total Suppliers"   — active supplier count
        //   Card 5: "Suppliers With Debt" — how many have unpaid balance
        Supplier.aggregate([
            matchStage,
            {
                $group: {
                    _id: null,
                    total_purchased: { $sum: "$total_purchased" },
                    total_paid: { $sum: "$total_paid" },
                    total_outstanding: { $sum: "$outstanding_balance" },
                    total_suppliers: { $sum: 1 },
                    count_with_debt: {
                        $sum: { $cond: [{ $gt: ["$outstanding_balance", 0] }, 1, 0] },
                    },
                },
            },
            { $project: { _id: 0 } },
        ]),

        // ── SECTION 2: Debt Concentration ────────────────────────────────────
        // FRONTEND → Pie Chart: "Where is my money owed?"
        //   Each slice = one supplier. Bigger slice = more risk.
        //   If one supplier = 80% of debt, you have a dependency problem.
        //   Shows top 5 suppliers by outstanding balance only.
        Supplier.aggregate([
            matchStage,
            { $match: { outstanding_balance: { $gt: 0 } } },
            { $sort: { outstanding_balance: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    supplier: "$company_name",
                    outstanding_balance: 1,
                },
            },
        ]),

        // ── SECTION 3: Purchase Loyalty ───────────────────────────────────────
        // FRONTEND → Horizontal Bar Chart: "Who am I giving the most business?"
        //   Each bar = one supplier, length = total amount purchased.
        //   Top suppliers are best candidates for bulk discount negotiations.
        //   Shows top 10 suppliers by lifetime spend.
        Supplier.aggregate([
            matchStage,
            { $match: { total_purchased: { $gt: 0 } } },
            { $sort: { total_purchased: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    supplier: "$company_name",
                    total_purchased: 1,
                    bills_count: 1,
                },
            },
        ]),

        // ── SECTION 4: Supply Chain Mix ───────────────────────────────────────
        // FRONTEND → Donut Chart: "What type of vendors do I use?"
        //   Each slice = a supplier_type (Manufacturer, Wholesaler, Retailer…)
        //   High % Retailers = paying more markup → consider finding Wholesalers.
        //   High % Manufacturers = best margins → keep prioritizing them.
        Supplier.aggregate([
            matchStage,
            {
                $group: {
                    _id: "$supplier_type",
                    count: { $sum: 1 },
                    total_purchased: { $sum: "$total_purchased" },
                },
            },
            {
                $project: {
                    _id: 0,
                    type: "$_id",
                    count: 1,
                    total_purchased: 1,
                },
            },
            { $sort: { total_purchased: -1 } },
        ]),

        // ── SECTION 5: Lead Time Benchmark ────────────────────────────────────
        // FRONTEND → Leaderboard Table or Bar Chart: "Who delivers fastest?"
        //   Sorted fastest → slowest (ascending lead_time).
        //   In a rush? Check the top of this list first.
        //   Shows top 10 suppliers that have a lead_time value defined.
        Supplier.aggregate([
            matchStage,
            { $match: { lead_time: { $gt: 0 } } },
            { $sort: { lead_time: 1 } },   // 1 = ascending (fastest first)
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    supplier: "$company_name",
                    lead_time_days: "$lead_time",
                    supplier_type: 1,
                },
            },
        ]),
    ]);

    return res.status(200).json(
        new ApiResponse(200, "Supplier analytics fetched successfully", {
            // Section 1 → Highlight Cards at top
            financial_summary: financialSummary[0] ?? {
                total_purchased: 0,
                total_paid: 0,
                total_outstanding: 0,
                total_suppliers: 0,
                count_with_debt: 0,
            },
            // Section 2 → Pie Chart
            debt_concentration: debtConcentration,
            // Section 3 → Horizontal Bar Chart
            purchase_loyalty: purchaseLoyalty,
            // Section 4 → Donut Chart
            supply_chain_mix: supplyChainMix,
            // Section 5 → Leaderboard Table / Bar Chart
            lead_time_benchmark: leadTimeBenchmark,
        })
    );
});
