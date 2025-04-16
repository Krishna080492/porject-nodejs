import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/ApiResponse.js";

// temporary checking user controller code:
// const registerUser = asyncHandler(async (req, res) => {
//   res.status(200).json({
//     message: "API run successfully",
//   });
// });

// steps for register user details:
// 1. get user details from frontend
// 2. validation - user fields not emty
// 3. check if user already exists through : username, email
// 4. check for ImageTrackList, avatar
// 5. upload them to cloudinary
// 6. create user object for entry in db using .create
// 7. remove password & refresh token field from response (we dont want it store in db so remove)
// 8. check if user create or Not
// 9. return res

// easy way:
// const registerUser = async (req, res) => {
//   let { username, email, fullName, password } = req.body;
//   try {
//     console.log("email : ", email);
//   } catch (error) {
//     console.log(error);
//   }
// };

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, fullName, password } = req.body;
    console.log(username, email, fullName, password); //get data

    //validation check for empty filed
    if (
      [username, email, fullName, password].some((field) => field?.trim() == "")
      //easy way: [username, email, fullName, password] == ""
    ) {
      throw new ApiError(400, "All Fields are Required")();
    }

    // check validation user exist or not
    const existedUser = await User.findOne({ $or: [{ username }, { email }] }); //$or operator for both condition check together otherwise u can check single single
    if (existedUser) {
      throw new ApiError(409, "username already exist or user with email");
    }
    // console.log("upload files : ", req.files);

    // check for ImageTrackList, avatar for server
    const avatarLocalPath = req.files?.avatar?.[0]?.path; //avatar[0] means avatar came from routes middleware name .path came from multer middleware path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!avatarLocalPath) {
      throw new ApiError(400, "avatar file is required");
    } // avatar is compulsary for this project so we check but coverimage we dont want compusary

    // upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatar) {
      throw new ApiError(400, "avatar file is required");
    }

    // create user object for entry in db using .create
    const user = await User.create({
      username: username.toLowerCase(), //we want username in lowercase
      email,
      fullName,
      password,
      avatar: avatar.url,
      coverImage: coverImage?.url || "", //above we dont check for coverimage so here we check if we have coverimage it return url otherwise it res. empty string
    });

    // remove password & refresh token field from response & check if user create or Not
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    ); // user is created or not check by id & .select is use for which field we dont need that field write in.
    if (!createdUser) {
      throw new ApiError(500, "something went wrong while register users.");
    }

    // return res
    return res
      .status(201)
      .json(
        new apiResponse(200, createdUser, "User Registered Successfully !!!")
      );
  } catch (err) {
    console.error("Error in registerUser:", err);
    throw err;
  }
});
export { registerUser };
