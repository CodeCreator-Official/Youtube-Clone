import { v2 as cloudinary } from 'cloudinary';
import ApiError from './ApiError.js'
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        if (!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        if (localFilePath) {
            fs.unlinkSync(localFilePath)
        }
        // removes temp file on local
        return null
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {

        if (!publicId) throw new ApiError(500, "Image not found")

        const response = await cloudinary.uploader.destroy(publicId)
        console.log(response)

    } catch (error) {
        throw new ApiError(500, "Process of Deleting image Failed")
    }
}

export default uploadOnCloudinary

export {
    deleteFromCloudinary
}