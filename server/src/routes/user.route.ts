import express from "express";
import { InviteUser, Login, Logout, Register } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { rbac } from "../middlewares/rbac.middleware";

const userRouter = express.Router();

userRouter.post("/register", Register);
userRouter.post("/invite",authMiddleware,rbac(),InviteUser)
userRouter.post("/login",Login)
//authMiddleware verifies the user’s identity, validates the JWT, checks account status, and attaches user info before allowing the logout controller to run.
userRouter.post("/logout",authMiddleware,Logout)


export default userRouter;