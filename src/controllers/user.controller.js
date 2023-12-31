import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User } from '../models/user.models.js'
import uploadOnCloudinary from '../utils/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'

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

    // Checks if email is valid or not
    if (email.indexOf('@') <= -1) {
        throw new ApiError(400, "Email is not a valid.")
    }

    // Checks if User is already registered or not
    const isUserExist = User.findOne({
        $or: [email, username]
    })

    if (isUserExist) {
        throw new ApiError(409, "User already exists");
    }

    // Storing images in server temperory
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    // Checks if avatarLocalPath valid or not
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required.")
    }

    const avatar = uploadOnCloudinary(avatarLocalPath)
    const coverImage = uploadOnCloudinary(coverImageLocalPath)

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

    if(!createdUser){
        throw new ApiError(500, "Server error while registering User.")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
})

export default registerUser