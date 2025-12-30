import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Market } from '../models/Market.model';
import { User } from '../models/User.model';
import { registerDto } from '../dtos/user.dto';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { registerValidator } from '../validators/user.validator';
import { ALL_PERMISSIONS } from '../permissions/main.perm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import crypto from 'crypto'
import { Invite } from '../models/Invite.model';



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

const validatePermissionsExist = (permissions: string[]): void => {
    const invalidPermissions = permissions.filter(p => !ALL_PERMISSIONS.includes(p as any));

    if (invalidPermissions.length > 0) {
        throw new ApiError(400, `Invalid permissions: ${invalidPermissions.join(", ")}`);
    }

}

const preventPermissionEscalation = (inviterPermissions: string[], toAssignPermissions: string[], isSuperAdmin: boolean): void => {
    
    //superadmin bypass
    if (isSuperAdmin && inviterPermissions.includes('*')) {
        return;
    }

    //1)check if inviter has perms to invite users
    if (!inviterPermissions.includes("user:invite")) {
        throw new ApiError(403, "You don't have user invitation permission");
    }

    //2)Permission escalation protection: ensure inviter has all permissions they are trying to assign
    const invalid = toAssignPermissions.filter(p => !inviterPermissions.includes(p));

    if (invalid.length > 0) {
    throw new ApiError(403, `Cannot assign permissions you don't own: ${invalid.join(", ")}`);
}
};



 //--- FRONTEND: send object which contains owner and market object ---
export const OwnerRegister = asyncHandler(async (req: Request, res: Response) => {

    //validate request body with help of zod validator
    const result = registerValidator.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
        }))
        throw new ApiError(400, `Validation Error: ${errors.map(e => e.field + ' => ' + e.message).join(', ')}`);
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

        // console.time("userPasswordHashing");
        // //remove this if pre hook is used in user model for hashing password
        // const saltRounds = Number(process.env.SALT_ROUNDS || 8);
        // const hashedPassword = await bcrypt.hash(owner.password, saltRounds);
        // owner.password = hashedPassword;
        // console.timeEnd("userPasswordHashing");

    //array here because mongoDB extracts an array
        const [userObj] = await User.create([{
            ...owner,
            market_id: marketObj._id,
            isSuperAdmin: true,
            isActive: true,
            status:"active",
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
    throw new ApiError(401, "Invalid email address");
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

  //if await is not used here then it returns a pending promise. so if pass is correct or wrong still it will be a promise which will act as truthy value and user will be able to login incorrect password
   const isMatch = await user.comparePasswords(password)
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


export const GetUserProfile=asyncHandler(async (req:Request,res:Response)=>{

  const userId=req.user?.userId
  if(!userId)
  {
    throw new ApiError(401,"Unauthorized");
  }

  const user=await User.findById(userId).select("-password -reset_token -reset_token_expiry -__v").populate("market_id","market_name market_email")

  if(!user)
  {
    throw new ApiError(404,"User not found")
  }

   if (user.status !== "active") {
      throw new ApiError(
        403,
        "Please accept invitation before accessing your profile"
      );
    }


    const responseData = {
      user: {
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        role: user.customRole || user.builtInRole,
        permissions: user.permissions || [],
        assignedShop_id: user.assignedShop_id,
        profile_image: user.profile_image,
        address: user.address,
      },
      market: user.market_id
        ? {
            id: (user.market_id as any)._id,
            name: (user.market_id as any).market_name,
            email: (user.market_id as any).market_email
          }
        : null,
    };
  return res.status(200)
  .json(new ApiResponse(200,"User details fetched successfully",responseData));


})

export const InviteUser = asyncHandler(async(req:Request, res:Response)=>{

    const {email,role,permissions}=req.body;
    const inviter=req.user;   //authMiddleware added "req.user"

    if(!inviter)  throw new ApiError(401,"Unauthorized");

    if(!email || !role || !Array.isArray(permissions) || permissions.length===0)
    {
      throw new ApiError(400,"Email, role and permissions are required");
    }

     validatePermissionsExist(permissions);
  preventPermissionEscalation(
    inviter.permissions,
    permissions,
    inviter.isSuperAdmin
  );

    const userExists=await User.findOne({
      email,
      market_id:inviter.marketId
    })

    if(userExists) throw new ApiError(400,"User already exists");
    
    //check if active invite already exists
    const inviteExists=await Invite.findOne({
      email,
      market_id:inviter.marketId,
      status:"invited"
    });

    if(inviteExists) throw new ApiError(400,"Invite already sent")

      //for testing
      const invite_token = "55550002"
      //const invite_token = crypto.randomBytes(32).toString("hex");

      await Invite.create({
        email,
        role,
        permissions,  
        market_id:inviter.marketId,
        invited_by:inviter.userId,
        invite_token,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),


      })

      const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${invite_token}`;

  // sendEmail(inviteLink)

  res.json(new ApiResponse(200, "Invitation sent successfully"));

});

export const AcceptInvite = asyncHandler(async (req: Request, res: Response) => {

  const { invite_token, name, username, password } = req.body;

  if (!invite_token || !name || !username || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const invite = await Invite.findOne({
    invite_token,
    status: "invited",
    expires_at: { $gt: new Date() },
  });

  if (!invite) {
    throw new ApiError(400, "Invalid or expired invite");
  }

   const usernameExists = await User.findOne({ username });
  if (usernameExists) {
    throw new ApiError(400, "Username already taken");
  }

  await User.create({
    email:invite.email,
    name,
    username,
    password,
    market_id:invite.market_id,
    customRole:invite.role,
    permissions:invite.permissions,
    status:"active",
    isActive:true,
    isSuperAdmin:false

  })

  invite.status="accepted"  
  invite.expires_at = null;        
  invite.accepted_at=new Date();
  await invite.save();

  res.json(new ApiResponse(200,"Invite accepted successfully"))
    
    

});

export const DeclineInvite = asyncHandler(async (req, res) => {
  const { invite_token } = req.body;

  const invite = await Invite.findOne({
    invite_token,
    status: "invited",
  });

  if (!invite) {
    throw new ApiError(400, "Invalid invite");
  }

  invite.status = "declined";
  invite.expires_at = null;
  invite.declined_at = new Date();
  await invite.save();

  res.json(new ApiResponse(200, "Invitation declined"));
});
