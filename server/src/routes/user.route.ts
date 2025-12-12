import express from "express";
import { Register } from "../controllers/user.controller";

const userRouter = express.Router();

userRouter.post("/register", Register);


export default userRouter;