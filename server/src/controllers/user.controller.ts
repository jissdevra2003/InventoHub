import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Market } from '../models/Market.model';
import { User } from '../models/User.model';
import { registerDto } from '../dtos/user.dto';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { registerValidator } from '../validators/user.validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const generateToken = (user_id: string, market_id: string ):string => {
    const tokenPayload = { user_id, market_id };
    // Generate JWT token with user_id and market_id
    // Use a secret key from environment variables or a default value
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'nothing', { expiresIn: '7d' });

    return token;
}


 //--- FRONTEND: send object which contains owner and market object ---
export const Register = asyncHandler(async (req: Request, res: Response) => {

    //validate request body with help of zod validator
    const result = registerValidator.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json(new ApiError(400, "Validation Error"));
    }


    //type safe and validated data using regisrterDto
    const data: registerDto = result.data;

    const { owner, market } = data;

    //checks
    if (!owner || !market) {
        return res.status(400).json(new ApiError(400, "Owner and Market information are required"));
    }

    //checks
    const existingMarket = await Market.findOne({
        $or: [
            { market_email: market.market_email },
            { market_phone: market.market_phone }
        ]
    });
    if (existingMarket) {
        return res.status(400).json(new ApiError(400, "Market with this email already exists"));
    }

    const existingUser = await User.findOne({
        $or: [
            { email: owner.email },
            { phone: owner.phone }
        ]
    });
    if (existingUser) {
        return res.status(400).json(new ApiError(400, "User with this email or phone already exists"));
    }


    // create market and user in DB here
    const marketObj = new Market({...market,isActive:true});
    await marketObj.save();
    
try {
        
        //remove this if pre hook is used in user model for hashing password
        const saltRounds = Number(process.env.SALT_ROUNDS || 10);
        const hashedPassword = await bcrypt.hash(owner.password, saltRounds);
        owner.password = hashedPassword;
    
        const userObj = new User({
            ...owner,
            market_id: marketObj._id,
            isSuperAdmin: true,
            isActive: true,
            permissions: ['*'] // all permissions
        });
        await userObj.save();
    
        const userData = await User.findById(userObj._id).select('-password -__v -createdAt -updatedAt').populate('market_id', 'market_name market_email market_phone');
    
        if (!userData) {
            return res.status(500).json(new ApiError(500, "Failed to create user"));
        }
    
        const marketData = await Market.findById(marketObj._id).select('-__v -createdAt -updatedAt');
    
        if (!marketData) {
            return res.status(500).json(new ApiError(500, "Failed to create market"));
        }
    
    const token = generateToken(userObj._id.toString(), marketObj._id.toString());
    
    
        // Set token in response header
        // res.setHeader('Authorization', `Bearer ${token}`);
    return res.
       status(201).
       cookie("token", token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: "lax",
       maxAge: 7 * 24 * 60 * 60 * 1000
         }).
       json(new ApiResponse(
            201,
            'Market and User registered successfully',
            { userData, marketData }
        ));
} catch (error) {
    if(marketObj && marketObj._id){
        await Market.findByIdAndDelete(marketObj._id);
    }
    return res.status(500).json(new ApiError(500, "Internal Server Error"));
    }
    
});