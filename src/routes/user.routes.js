import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// registration
router.route("/register").post(
  upload.fields([
    //middleware multer : multiple files mate fields
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
); //http://localhost:8000/api/v1/users/register

// login
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser); //verifyjwt came from middleware, its a middleware

// end point of refreshtoken
router.route("/refresh-token").post(refreshAccessToken);

export default router;
