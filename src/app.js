import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors());
// config
app.use(express.json({ limit: "16kb" })); //for json
app.use(express.urlencoded({ extended: true })); //for url
app.use(express.static("public")); //for public access
app.use(cookieParser()); //for user cookies access - for crud operation

//routes import
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);     //http://localhost:8000/api/v1/users

export { app };
