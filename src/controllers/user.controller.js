import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import uploadOnCloudinary, { deleteFromCloudinary } from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const generateAcessAndRefreshTokens = async (userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Somthing went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    const { fullname, username, email, password } = req.body
    console.log("email :", email)
    console.log("password :", password)

    // Check if fields are empty or not
    if (
        [fullname, username, email, password].some((field) => field?.trim === "")
    ) {
        throw new ApiError(400, "All fields are required.")
    }

    // Checks if User is already registered or not
    const isUserExist = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (isUserExist) {
        throw new ApiError(409, "User already exists");
    }

    // Storing images in server temperory
    let avatarLocalPath = req.files?.avatar[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImage = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    // Checks again for avatar because it is important
    if (!avatar) {
        throw new ApiError(400, "Avatar is required.")
    }

    // Creating Object for Database
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // Removing some fields
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Server error while registering User.")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User Registered Successfully")
        )
})

const LoginUser = asyncHandler(async (req, res) => {

    // Get username email and password
    const { username, email, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required. ")
    }

    // Finding user in database
    const userExist = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!userExist) {
        throw new ApiError(404, "User does not exist. 🤨🤨")
    }

    // Checking is password is correct or not
    const isPasswordCorrect = await userExist.isPasswordCorrect(password)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Password is incorrect 🤨🤨")
    }

    // Generating refresh and access token
    const { accessToken, refreshToken } = await generateAcessAndRefreshTokens(userExist._id)

    // Adding refresh token in userData
    // userExist.refreshToken = refreshToken
    // await userExist.save({ validateBeforeSave: false })
    const userWithoutPassword = await User.findById(userExist._id).select("-password -refreshToken")

    const SecureMyCookie = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, SecureMyCookie)
        .cookie("refreshToken", refreshToken, SecureMyCookie)
        .json(
            new ApiResponse(
                200,
                {
                    user: userWithoutPassword,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                },
                "User logged in successfully 😁😁"
            )
        )
})

const LogoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: { refreshToken: 1 }
            // $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

    const SecureMyCookie = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", SecureMyCookie)
        .clearCookie("refreshToken", SecureMyCookie)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged Out 😀😀"
            )
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const refreshTokenFromClient = req.cookies.refreshToken || req.body.refreshToken

    if (!refreshTokenFromClient) {
        throw new ApiError(401, "Unauthorized request")
    }
    try {

        const decodedTokenOfClient = jwt.verify(
            refreshAccessToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedTokenOfClient?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh Token")
        }

        if (decodedTokenOfClient !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const SecureMyCookie = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAcessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken)
            .cookie("refreshToken", newrefreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken: accessToken,
                        refreshToken: newrefreshToken
                    },
                    "Successfully generated new access Token"
                )
            )
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating new access Token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body
    const user = User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password")
    }

    user.password = newPassword
    await user.save({ validateBeforSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password updated successfully"
            )
        )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                res.user,
                "User Fetched successfully"
            )
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullname, email } = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findOneAndUpdate(
        req.user._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "User Details Updated Successfully"
            )
        )
})

const updateAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(200, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Somthing went wrong while uploading avatar")
    }
    const user = req?.user

    if (!user) {
        throw new ApiError(401, "Unauthenticated request")
    }

    const oldUser = await User.findById(user?._id)

    if (!oldUser) {
        throw new ApiError(404, "User not found")
    }
    const oldImageUrl = oldUser.avatar

    await deleteFromCloudinary(oldImageUrl)

    const newUser = await User.findByIdAndUpdate(
        user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newUser,
                "Avatar updated successfully"
            )
        )
})

const updateCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(200, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "Somthing went wrong while uploading coverImage")
    }
    const user = req?.user

    if (!user) {
        throw new ApiError(401, "Unauthenticated request")
    }

    const oldUser = await User.findById(user?._id)

    if (!oldUser) {
        throw new ApiError(404, "User not found")
    }
    const oldImageUrl = oldUser.coverImage

    if(oldImageUrl != ''){
        await deleteFromCloudinary(oldImageUrl)
    }

    const newuser = await User.findByIdAndUpdate(
        user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newuser,
                "Cover Image updated successfully"
            )
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is a required field.")
    }

    const channel = await User.aggregate([

        // 1st stage - Finding user from database
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        // 2nd stage - Adding subscribers field to user data model
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        // 3rd stage - Adding subscribedTo field to user data model
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // 4th stage - Adding subscribersCount and channelsSubscribedToCount to user data model
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                // Adding a feature of toggle of Subscribe and Unsubscribe
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        // 5th stage - Sending selected fields
        {
            $project: {
                fullname: 1,
                username: 1,
                email: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }

    console.log(channel)

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "Channel fetched Successfully"
            )
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {

    const userId = new mongoose.Types.ObjectId(req.user._id)

    const user = await User.aggregate([

        // 1st stage - Picking the user from db using userId
        {
            $match: {
                _id: userId
            }
        },
        // 2nd stage - Adding videos as a watchHistory in user model
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // Nested pipeline for owner which will reference to users
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            // Selecting fields we want
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "WatchHistory fetched Successfully."
            )
        )
})

export {
    registerUser,
    LoginUser,
    LogoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
};