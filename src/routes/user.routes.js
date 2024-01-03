import { LoginUser, LogoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { Router } from "express";
import upload from "../middlewares/multer.middleware.js"
import verifyJWT from "../middlewares/auth.middleware.js";
const userRouter = Router()

userRouter
    .route('/register')
    .post(
        upload.fields([
            {
                name: 'avatar',
                maxCount: 1
            },
            {
                name: 'coverImage',
                maxCount: 1
            }
        ]),
        registerUser
    )

userRouter
    .route("/login")
    .post(LoginUser)

// Secured routes
userRouter
    .route("/logout")
    .post(verifyJWT, LogoutUser)

userRouter
    .route("refresh-token")
    .post(refreshAccessToken)

export default userRouter