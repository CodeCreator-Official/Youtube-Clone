import { LoginUser, LogoutUser, changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, refreshAccessToken, registerUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
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
    .route("/refresh-token")
    .post(refreshAccessToken)

userRouter
    .route("/change-password")
    .post(verifyJWT, changeCurrentPassword)

userRouter
    .route("/currentUser")
    .get(verifyJWT, getCurrentUser)

userRouter
    .route("/update-account")
    .patch(verifyJWT, updateAccountDetails)

userRouter
    .route("/update-Avatar")
    .patch(verifyJWT, upload.single("avatar"), updateAvatar)

userRouter
    .route("/update-coverImage")
    .patch(verifyJWT, upload.single("coverImage"), updateCoverImage)

userRouter
    .route("/c/:username")
    .get(verifyJWT, getUserChannelProfile)

userRouter
    .route("/watch-history")
    .get(verifyJWT, getWatchHistory)
export default userRouter