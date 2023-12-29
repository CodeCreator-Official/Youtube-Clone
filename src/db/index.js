import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js' 

const connectDB = async () => { 
    try {
        
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)

        console.log(`\n\nMongoDB connected !! DB Host: ${connectionInstance.connection.host}`)

    } catch (error) {
        console.log('MONGODB Error',error);
        process.exit(1);
    }
}

export default connectDB

