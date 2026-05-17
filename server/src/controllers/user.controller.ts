import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Market } from '../models/Market.model';
import { User } from '../models/User.model';
import { AdminUpdateUserDto, registerDto, updateMyProfileDto } from '../dtos/user.dto';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { adminUpdateUserValidator, registerValidator, updateMeValidator } from '../validators/user.validator';
import { ALL_PERMISSIONS } from '../permissions/main.perm';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto'
import { Invite } from '../models/Invite.model';
import { Shop } from '../models/Shop.model';
import { canUpdateUser } from '../utils/userAccess';
import { sendEmail } from '../utils/sendEmail';



const generateToken = (user_id: string, market_id: string): string => {
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
    throw new ApiError(400, `Validation Error: ${errors.map(e => e.field + ' => ' + e.message).join('; ')}`);
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
    const [marketObj] = await Market.create([{ ...market, isActive: true }], { session });

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
      status: "active",
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
        secure: true,
        sameSite: "none",
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

export const Login = asyncHandler(async (req: Request, res: Response) => {


  const { email, password } = req.body

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  //find user by email — select only fields needed for login checks + response
  const user = await User.findOne({ email })
    .select("email password isActive status role market_id")
    .populate("market_id", "market_name market_email");

  if (!user) {
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

  const token = generateToken(
    user._id.toString(),
    user.market_id._id.toString()

  )

  return res
    .status(200)
    .cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
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

export const Logout = asyncHandler(async (req: Request, res: Response) => {

  return res
    .status(200)
    .clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none"
    })
    .json(new ApiResponse(200, "Logged out successfully"));
})


export const GetUserProfile = asyncHandler(async (req: Request, res: Response) => {

  const userId = req.user?.userId
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await User.findById(userId).select("-password -reset_token -reset_token_expiry -__v").populate("market_id", "market_name market_email")

  if (!user) {
    throw new ApiError(404, "User not found")
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
      assignedShops_id: user.assignedShops_id,
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
    .json(new ApiResponse(200, "User details fetched successfully", responseData));


})

export const InviteUser = asyncHandler(async (req: Request, res: Response) => {

  const { email, role, permissions, assignedShops_id } = req.body;
  const inviter = req.user;   //authMiddleware added "req.user"

  if (!inviter) throw new ApiError(401, "Unauthorized");

  if (!email || !role || !Array.isArray(permissions) || permissions.length === 0) {
    throw new ApiError(400, "Email, role and permissions are required");
  }

  validatePermissionsExist(permissions);
  preventPermissionEscalation(
    inviter.permissions,
    permissions,
    inviter.isSuperAdmin
  );

  // Validate assigned shops belong to the same market
  if (assignedShops_id && Array.isArray(assignedShops_id) && assignedShops_id.length > 0) {
    const shops = await Shop.find({
      _id: { $in: assignedShops_id },
      market_id: inviter.marketId,
      isActive: true,
    });

    if (shops.length !== assignedShops_id.length) {
      throw new ApiError(404, "One or more shops not found or not in your market");
    }
  }

  const userExists = await User.findOne({
    email,
    market_id: inviter.marketId
  })

  if (userExists) throw new ApiError(400, "User already exists");

  //check if active invite already exists
  const inviteExists = await Invite.findOne({
    email,
    market_id: inviter.marketId,
    status: "invited"
  });

  if (inviteExists) throw new ApiError(400, "Invite already sent")

  const invite_token = crypto.randomBytes(32).toString("hex");

  await Invite.create({
    email,
    role,
    permissions,
    assignedShops_id: assignedShops_id || [],
    market_id: inviter.marketId,
    invited_by: inviter.userId,
    invite_token,
    status: "invited",
    expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
  })

  const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${invite_token}`;

  // Send invite email
  try {
    await sendEmail({
      to: email,
      subject: "InventoHub — You've been invited to join a team!",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #818cf8); margin-bottom: 12px;">
              <span style="font-size: 20px; color: #fff; font-weight: 700;">IH</span>
            </div>
            <h2 style="color: #1e293b; margin: 0 0 4px 0; font-size: 22px;">You're Invited!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">Join the team on InventoHub</p>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              You've been invited to join as <strong style="color: #6366f1;">${role}</strong>.
              Click the button below to set up your account and get started.
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${inviteLink}"
                 style="display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.02em;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0 0; text-align: center;">
              This invitation expires in 48 hours.
            </p>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send invite email:", emailError);
    // Don't fail the invite if email fails — the link is still valid
  }

  res.json(new ApiResponse(200, "Invitation sent successfully", { inviteLink }));

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
    email: invite.email,
    name,
    username,
    password,
    market_id: invite.market_id,
    customRole: invite.role,
    permissions: invite.permissions,
    assignedShops_id: invite.assignedShops_id || [],
    createdBy: invite.invited_by,      //who invited (admin/manager) 
    status: "active",
    isActive: true,
  })

  invite.status = "accepted"
  invite.expires_at = null;
  invite.accepted_at = new Date();
  await invite.save();

  res.json(new ApiResponse(200, "Invite accepted successfully"))



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

export const ListUsers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { page = "1", role } = req.query;

  //identify the page number 
  const pageNumber = Math.max(parseInt(page as string, 10), 1);    //eg pageNumber=3

  //how many records to skip identify using pageNumber
  //pageNumber=3   skip=(3-1)*10
  const skip = (pageNumber - 1) * 10;   // 10 here is the limit

  const limitNumber = 10;   //fixed 10 number limit

  const filter: any = {
    market_id: req.user.marketId
  };


  // ---------------------------
  // Visibility rules
  // ---------------------------
  // Admin / SuperAdmin → see all users in market
  // Manager & Staff → see only users created / invited by them
  const ownerAccess = req.user.isSuperAdmin && req.user.permissions?.includes("*");
  if (!ownerAccess && req.user.builtInRole !== "admin") {
    filter.createdBy = req.user.userId;
  }

  if (role) {
    filter.$or = [
      { builtInRole: role },
      { customRole: role },
    ];
  }

  //db query 
  //running two queries at the same time 
  //fetches user data and count of users based on filter

  const [users, total] = await Promise.all([             //first value will be assigned to 'users' and second value to 'totals' 
    User.find(filter)
      .select("_id name market_id username email phone status builtInRole customRole assignedShops_id createdAt")
      .populate("assignedShops_id", "name")
      .sort({ createdAt: -1 })     //sort based on createdAt in descending order
      .skip(skip)               //skip this many number of records
      .limit(10)

    ,

    User.countDocuments(filter)     //count the user documents that match the given filter
  ]);

  const totalPages = Math.ceil(total / 10);
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + 10, total);

  const pagination = {
    total,
    page: pageNumber,
    limit: 10,
    totalPages,
    hasNextPage: pageNumber < totalPages,
    hasPrevPage: pageNumber > 1,
    from,
    to
  };

  const responseUsers = users.map((u) => ({
    id: u._id,
    name: u.name,
    market_id: u.market_id,
    username: u.username,
    email: u.email,
    phone: u.phone,
    status: u.status,
    role: u.customRole || u.builtInRole,
    assignedShops_id: u.assignedShops_id
      ? (u.assignedShops_id as any[]).map((shop: any) => ({
        id: shop._id,
        name: shop.name,
      }))
      : [],
    createdAt: u.createdAt,
  }));

  return res.status(200).json(

    new ApiResponse(200, "Users fetched successfully", {
      users: responseUsers,
      pagination
    })
  );


});



export const UpdateMyProfile = asyncHandler(async (req: Request, res: Response) => {

  //user authenticated
  const loggedInUser = req.user;
  if (!loggedInUser) {
    throw new ApiError(401, "Unauthorized");
  }

  const result = updateMeValidator.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map(
      err => `${err.path.join(".")}: ${err.message}`
    );
    throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
  }


  const updatedData: updateMyProfileDto = result.data;

  //  Prevent empty update
  if (Object.keys(updatedData).length === 0) {
    throw new ApiError(400, "No fields provided to update");
  }

  const updatedUser = await User.findByIdAndUpdate(
    loggedInUser.userId,
    { $set: updatedData },
    { new: true }
  ).select(
    "_id name email phone address profile_image builtInRole createdAt")

  if (!updatedUser) {
    throw new ApiError(404, "User not found")
  }

  return res.status(200).json(
    new ApiResponse(200, "Profile details updated successfully", {
      user: updatedUser,
    })
  );


})


export const DisableUser = asyncHandler(async (req: Request, res: Response) => {

  const loggedInUser = req.user;
  if (!loggedInUser) {
    throw new ApiError(401, "Unauthorized");
  }

  const { userId } = req.params;

  //Prevent self-disable
  if (loggedInUser.userId === userId) {
    throw new ApiError(400, "You cannot disable your own account");
  }

  const userToDisable = await User.findById(userId);

  if (!userToDisable) {
    throw new ApiError(404, "User not found");
  }

  // Must belong to same market
  if (userToDisable.market_id.toString() !== loggedInUser.marketId) {
    throw new ApiError(403, "Access denied");
  }

  // Manager & Staff visibility rule: can only disable users they invited
  const ownerAccessDisable = loggedInUser.isSuperAdmin && loggedInUser.permissions?.includes("*");
  if (
    !ownerAccessDisable && loggedInUser.builtInRole !== "admin" &&
    userToDisable.createdBy?.toString() !== loggedInUser.userId
  ) {
    throw new ApiError(403, "You can disable only users created/invited by you");
  }


  // Already disabled?
  if (userToDisable.status === "disabled") {
    throw new ApiError(400, "User is already disabled");
  }

  userToDisable.isActive = false;
  userToDisable.status = "disabled";

  await userToDisable.save();

  return res.status(200).json(
    new ApiResponse(200, "User disabled successfully")
  );
})


export const EnableUser = asyncHandler(
  async (req: Request, res: Response) => {
    const loggedInUser = req.user;
    if (!loggedInUser) {
      throw new ApiError(401, "Unauthorized");
    }

    const { userId } = req.params;

    const userToEnable = await User.findById(userId);

    if (!userToEnable) {
      throw new ApiError(404, "User not found");
    }

    if (userToEnable.market_id.toString() !== loggedInUser.marketId) {
      throw new ApiError(403, "Access denied");
    }

    // Manager & Staff visibility rule: can only enable users they invited
    const ownerAccessEnable = loggedInUser.isSuperAdmin && loggedInUser.permissions?.includes("*");
    if (
      !ownerAccessEnable && loggedInUser.builtInRole !== "admin" &&
      userToEnable.createdBy?.toString() !== loggedInUser.userId
    ) {
      throw new ApiError(403, "You can enable only users created/invited by you");
    }

    if (userToEnable.status !== "disabled") {
      throw new ApiError(400, "User is not disabled");
    }

    userToEnable.isActive = true;
    userToEnable.status = "active";
    await userToEnable.save();

    return res.status(200).json(
      new ApiResponse(200, "User enabled successfully")
    );

  })


export const updateUserById = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = req.user;
  const { targetUserId } = req.params;


  if (!loggedInUser) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!targetUserId) {
    throw new ApiError(400, "Target userId is required");
  }

  const updates = req.body as AdminUpdateUserDto;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "Updated data is required")
  }

  // Prevent self-update
  if (loggedInUser.userId === targetUserId) {
    throw new ApiError(400, "Use /users/me to update your profile");
  }

  // Validate targetUserId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  // VALIDATE UPDATES DTO
  const validationResult = adminUpdateUserValidator.safeParse(updates);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map(
      err => `${err.path.join(".")}: ${err.message}`
    );
    throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
  }

  // Prevent empty update
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields provided to update");
  }

  // 1. Find target user (market isolation)
  const targetUser = await User.findOne({
    _id: targetUserId,
    market_id: loggedInUser.marketId,
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // 2. Authorization (centralized RBAC)
  canUpdateUser(loggedInUser, targetUser);

  // 3. Prevent permission escalation when updating permissions or customRole
  if (updates.permissions !== undefined) {
    validatePermissionsExist(updates.permissions);
    preventPermissionEscalation(
      loggedInUser.permissions,
      updates.permissions,
      loggedInUser.isSuperAdmin
    );
  }

  // 4. Validate and check assignedShops_id if provided
  if (updates.assignedShops_id !== undefined && updates.assignedShops_id !== null) {
    if (!Array.isArray(updates.assignedShops_id)) {
      throw new ApiError(400, "assignedShops_id must be an array");
    }

    for (const shopId of updates.assignedShops_id) {
      if (!mongoose.Types.ObjectId.isValid(shopId as string)) {
        throw new ApiError(400, "Invalid shop ID format");
      }
    }

    // Verify shop exists and belongs to same market
    if (updates.assignedShops_id.length > 0) {
      const shops = await Shop.find({
        _id: { $in: updates.assignedShops_id },
        market_id: loggedInUser.marketId,
      });

      if (shops.length !== updates.assignedShops_id.length) {
        throw new ApiError(404, "One or more shops not found or not in your market");
      }
    }
  }

  // 5. Apply updates using AdminUpdateUserDto
  if (updates.name !== undefined) {
    targetUser.name = updates.name;
  }

  if (updates.phone !== undefined) {
    targetUser.phone = updates.phone;
  }

  if (updates.address !== undefined) {
    targetUser.address = updates.address;
  }

  if (updates.profile_image !== undefined) {
    targetUser.profile_image = updates.profile_image;
  }

  if (updates.customRole !== undefined) {
    targetUser.customRole = updates.customRole;
  }

  if (updates.permissions !== undefined) {
    targetUser.permissions = updates.permissions;
  }

  if (updates.assignedShops_id !== undefined) {
    targetUser.assignedShops_id = updates.assignedShops_id as any;
  }

  if (updates.status !== undefined) {
    targetUser.status = updates.status;
    targetUser.isActive = updates.status === "active";
  }

  await targetUser.save();

  return res.status(200).json(
    new ApiResponse(200, "User updated successfully", {
      id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      status: targetUser.status,
    })
  );
});





export const updateUserByEmail = asyncHandler(async (req: Request, res: Response) => {
  const loggedInUser = req.user;
  const { targetUserEmail, ...updates } = req.body as {
    targetUserEmail: string;
  } & AdminUpdateUserDto;

  if (!loggedInUser) {
    throw new ApiError(401, "Unauthorized");
  }

  if (!targetUserEmail || Object.keys(updates).length === 0) {
    throw new ApiError(400, "Target user email and update data are required");
  }

  const normalizedTargetEmail = targetUserEmail.toLowerCase().trim();
  const normalizedLoggedInEmail = loggedInUser.email.toLowerCase().trim();

  // Prevent self-update
  if (normalizedLoggedInEmail === normalizedTargetEmail) {
    throw new ApiError(400, "Use /users/me to update your profile");
  }

  // VALIDATE UPDATES DTO
  const validationResult = adminUpdateUserValidator.safeParse(updates);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map(
      err => `${err.path.join(".")}: ${err.message}`
    );
    throw new ApiError(400, `Validation error: ${errors.join(", ")}`);
  }

  // Prevent empty update
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields provided to update");
  }

  // 1. Find target user (market isolation)
  const targetUser = await User.findOne({
    email: normalizedTargetEmail,
    market_id: loggedInUser.marketId,
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // 2. Authorization (centralized RBAC)
  canUpdateUser(loggedInUser, targetUser);

  // 3. Prevent permission escalation when updating permissions or customRole
  if (updates.permissions !== undefined) {
    validatePermissionsExist(updates.permissions);
    preventPermissionEscalation(
      loggedInUser.permissions,
      updates.permissions,
      loggedInUser.isSuperAdmin
    );
  }

  // 4. Validate and check assignedShops_id if provided
  if (updates.assignedShops_id !== undefined && updates.assignedShops_id !== null) {
    if (!Array.isArray(updates.assignedShops_id)) {
      throw new ApiError(400, "assignedShops_id must be an array");
    }

    for (const shopId of updates.assignedShops_id) {
      if (!mongoose.Types.ObjectId.isValid(shopId as string)) {
        throw new ApiError(400, "Invalid shop ID format");
      }
    }

    // Verify shop exists and belongs to same market
    if (updates.assignedShops_id.length > 0) {
      const shops = await Shop.find({
        _id: { $in: updates.assignedShops_id },
        market_id: loggedInUser.marketId,
      });

      if (shops.length !== updates.assignedShops_id.length) {
        throw new ApiError(404, "One or more shops not found or not in your market");
      }
    }
  }

  // 5. Apply updates using AdminUpdateUserDto
  if (updates.name !== undefined) {
    targetUser.name = updates.name;
  }

  if (updates.phone !== undefined) {
    targetUser.phone = updates.phone;
  }

  if (updates.address !== undefined) {
    targetUser.address = updates.address;
  }

  if (updates.profile_image !== undefined) {
    targetUser.profile_image = updates.profile_image;
  }

  if (updates.customRole !== undefined) {
    targetUser.customRole = updates.customRole;
  }

  if (updates.permissions !== undefined) {
    targetUser.permissions = updates.permissions;
  }

  if (updates.assignedShops_id !== undefined) {
    targetUser.assignedShops_id = updates.assignedShops_id as any;
  }

  if (updates.status !== undefined) {
    targetUser.status = updates.status;
    targetUser.isActive = updates.status === "active";
  }

  await targetUser.save();

  return res.status(200).json(
    new ApiResponse(200, "User updated successfully", {
      id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      status: targetUser.status,
    })
  );
});
