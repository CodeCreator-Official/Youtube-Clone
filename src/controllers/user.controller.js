import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import uploadOnCloudinary from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

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
            $set: { refreshToken: undefined }
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

export {
    registerUser,
    LoginUser,
    LogoutUser,
    refreshAccessToken
};