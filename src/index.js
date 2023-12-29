import connectDB from './db/index.js'
import dotenv from 'dotenv'
dotenv.config({path: '../env'})

connectDB() 
.catch((err) => console.log(err.message))















// import express from 'express'
// const app = express()

//     ; (async () => {
//         try {
//             await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)

//             app.on('error', (error) => {
//                 console.log('Error: ',error)
//             })

//             app.listen(process.env.PORT, () => {
//                 console.log(`Listen on port : ${process.env.PORT}`)
//             })
//         } catch (error) {
//             console.log('Error :: index.js :: IIFE', error.message)
//         }
//     })()