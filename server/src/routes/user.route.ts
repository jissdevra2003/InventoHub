import express from "express";
import { InviteUser, Login, Logout, Register } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/authorize.middleware";
import { PERMISSIONS } from "../permissions/main.perm";
import { AcceptInvite } from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.post("/register", Register);
userRouter.post("/invite", authMiddleware, authorize([PERMISSIONS.USER.INVITE]), InviteUser)
userRouter.post("/accept-invite", AcceptInvite);
userRouter.post("/login",Login)
//authMiddleware verifies the user’s identity, validates the JWT, checks account status, and attaches user info before allowing the logout controller to run.
userRouter.post("/logout", authMiddleware, Logout)



export default userRouter;