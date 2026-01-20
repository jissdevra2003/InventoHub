import express from "express";
import { DeclineInvite, InviteUser, Login, Logout, OwnerRegister,GetUserProfile,ListUsers, UpdateMyProfile, DisableUser, EnableUser, updateUserById, updateUserByEmail } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import { AcceptInvite } from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.post("/register", OwnerRegister);
userRouter.post("/invite", authMiddleware
,rbac([PERMISSIONS.USER.INVITE])
,InviteUser);
userRouter.post("/accept-invite", AcceptInvite);
userRouter.post("/decline-invite",DeclineInvite);
userRouter.post("/login",Login);

userRouter.get("/me",
authMiddleware,
GetUserProfile);

userRouter.get("/listUsers",
authMiddleware,
rbac([PERMISSIONS.USER.READ]),
ListUsers);

//authMiddleware verifies the user’s identity, validates the JWT, checks account status, and attaches user info before allowing the logout controller to run.
userRouter.post("/logout", 
authMiddleware, 
Logout);

userRouter.patch("/update-me",
authMiddleware,
UpdateMyProfile);

userRouter.patch(
  "/:userId/disable",
  authMiddleware,
  rbac([PERMISSIONS.USER.UPDATE]),
  DisableUser
);

userRouter.patch(
  "/:userId/enable",
  authMiddleware,
  rbac([PERMISSIONS.USER.UPDATE]),
  EnableUser
);

userRouter.patch(
"/:targetUserId",
authMiddleware,
rbac([PERMISSIONS.USER.UPDATE]),
updateUserById
);

userRouter.patch(
"/update-by-email",
authMiddleware,
rbac([PERMISSIONS.USER.UPDATE]),
updateUserByEmail
)



export default userRouter;