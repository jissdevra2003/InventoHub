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
import mongoose from 'mongoose';
import crypto from 'crypto'
import { fi } from 'zod/v4/locales';


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
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
        }))
        throw new ApiError(400, `Validation Error: ${JSON.stringify(errors.map(e => e.field + ' => ' + e.message).join(', '))}`);
    }


    //type safe and validated data using regisrterDto
    const data: registerDto = result.data;

    const { owner, market } = data;

    //checks
    if (!owner || !market) {
       throw new ApiError(400, "Owner and Market information are required");
    }

    //checks
    const [
        existingUserName,
        existingMarket,
        existingUser
        ] = await Promise.all([
        User.findOne({ username: owner.username }),
        Market.findOne({
          $or: [
            { market_email: market.market_email },
            { market_phone: market.market_phone }
          ]
        }),
        User.findOne({
          $or: [
            { email: owner.email },
            { phone: owner.phone }
          ]
  })
]);

   
   if (existingUserName) {
       throw new ApiError(400, "Username already taken");
   }

    if (existingMarket) {
        throw new ApiError(400, "Market with this email or phone number already exists");
    }

    if (existingUser) {
        throw new ApiError(400, "User with this email or phone already exists");
    }

    
    //START session 
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // create market and user in DB here
        //save the market and user data in DB and doing it inside the transaction
         const [marketObj] = await Market.create([{...market,isActive:true}], { session });

        console.time("userPasswordHashing");
        //remove this if pre hook is used in user model for hashing password
        const saltRounds = Number(process.env.SALT_ROUNDS || 8);
        const hashedPassword = await bcrypt.hash(owner.password, saltRounds);
        owner.password = hashedPassword;
        console.timeEnd("userPasswordHashing");

    //array here because mongoDB extracts an array
        const [userObj] = await User.create([{
            ...owner,
            market_id: marketObj._id,
            isSuperAdmin: true,
            isActive: true,
            permissions: ['*'] // all permissions as SuperAdmin
        }], { session });

        //COMMIT transaction   ,   save changes to the DB
        await session.commitTransaction();
                                                                                                        
        const userData = await User.findById(userObj._id).select('-password -__v -createdAt -updatedAt').populate('market_id', 'market_name market_email market_phone');
    
        if (!userData) {
            throw new ApiError(500, "Failed to create user");
        }
    
        const marketData = await Market.findById(marketObj._id).select('-__v -createdAt -updatedAt');
    
        if (!marketData) {
            throw new ApiError(500, "Failed to create market");
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
        //ABORT transaction , Auto rollback
        await session.abortTransaction();
        console.error("Error during registration:", error);

        throw error instanceof ApiError ? error : new ApiError(500, "Internal Server Error");
    }
    finally {
        session.endSession();
    }
    
});


export const Login =asyncHandler(async (req:Request, res:Response)=>{


    const {email,password}=req.body

     if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  //find user by email and populate with market(organization details) in which organization the user works in 
  const user= await User.findOne({email}).populate("market_id","market_name market_email");

  if(!user)
  {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "User account is inactive");
  }

  if (user.status !== "active") {
    throw new ApiError(403, "Please accept invitation before logging in");
  }

  if (!user.password) {
    throw new ApiError(401, "Password not set for this account");
  }

   const isMatch = user.comparePasswords(password)
   if (!isMatch) {
    throw new ApiError(401, "Invalid password");
  }

  const token=generateToken(
user._id.toString(),
user.market_id._id.toString()

  )

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    .json(
      new ApiResponse(200, "Login successful", {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        market: {
          id: user.market_id._id,
          name: user.market_id.market_name
        }
      })
    );




})

export const Logout = asyncHandler(async (req:Request, res:Response)=>{

    return res
    .status(200)
    .clearCookie("token",{
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:"lax"
    })
    .json(new ApiResponse(200,"Logged out successfully"));
})

export const InviteUser=asyncHandler(async(req:Request, res:Response)=>{

    const {email,role}=req.body

    const loggedInUser=req.user;     //user added in auth.middleware
    if(!loggedInUser)
    {
        throw new ApiError(400,"Unauthorized access");
    }

    if(!email || !role)
    {
        throw new ApiError(400,"Email and role are required");
    }

    if(!["manager","staff"].includes(role))
    {
        throw new ApiError(400,"Invalid role");
    }

    // Check if user already exists in this market
  const existingUser = await User.findOne({
    email,
    market_id: loggedInUser.marketId
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists in this organization");
  }

  // Generate secure invite token
  const inviteToken = crypto.randomBytes(32).toString("hex");

  // Set expiry (48 hours)
  const inviteExpires = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await User.create({
email,
role,
market_Id:loggedInUser.marketId,
status:"invited",
invite_token:inviteToken,
invite_expires:inviteExpires,
isActive:true


  })

   // 6️⃣ Send invite email (for now just log link)
  const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

   

   return res.status(200).json(
    new ApiResponse(200, "Invitation sent successfully")
  );


})