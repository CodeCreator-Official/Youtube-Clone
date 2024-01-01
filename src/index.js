import connectDB from './db/index.js'
import app from './app.js'
import dotenv from 'dotenv'
dotenv.config({path: './.env'})
const port = process.env.PORT || 8000

connectDB()
.then(() => {
    // Handling error on app
    app.on('error', (err) => {
        console.log(err)
    })

    app.listen(port, () => {
        console.log(`Server is listening on http://localhost:${port}`)
    })
})
.catch((err) => console.log("MONGO DB CONNECTION FAILED",err.message))















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