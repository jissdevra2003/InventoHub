import express from "express";
import { DeclineInvite, InviteUser, Login, Logout, OwnerRegister } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import { AcceptInvite } from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.post("/register", OwnerRegister);
userRouter.post("/invite", authMiddleware, rbac([PERMISSIONS.USER.INVITE]), InviteUser)
userRouter.post("/accept-invite", AcceptInvite);
userRouter.post("/decline-invite",DeclineInvite);
userRouter.post("/login",Login)
//authMiddleware verifies the user’s identity, validates the JWT, checks account status, and attaches user info before allowing the logout controller to run.
userRouter.post("/logout", authMiddleware, Logout)



export default userRouter;