import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/ApiResponse.js";
import jet from "jsonwebtoken";

// temporary checking user controller code:
// const registerUser = asyncHandler(async (req, res) => {
//   res.status(200).json({
//     message: "API run successfully",
//   });
// });

// create access n refresh token method together for further use
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    // generate token
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; //refresh token also save in database
    await user.save({ validateBeforeSave: false }); //without validation password save in db

    return { accessToken, refreshToken }; //after generating token it return
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

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

// steps for login user details:
// get data from req.body
// username or email checking
// find the user
// if user get check for password
// password correct : refresh token n access token work start
// send cookies
// res send
const loginUser = asyncHandler(async (req, res) => {
  // get data from req.body
  const { username, email, password } = req.body;

  // username || email checking - if we want both then &&
  if (!(username || email)) {
    //check both email n username for login
    throw new ApiError(400, "username or email required!!");
  }

  // find the user
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User doesn't exist");
  }

  // if user get check for password
  const isPasswordValid = await user.isPasswordCorrect(password); //ispasswordcorrect comming from user.model
  if (!isPasswordValid) {
    throw new ApiError(401, "Password Incorrect");
  }

  // password correct : refresh token n access token work start -first generate this part is above the code start generate access n refresh token after that
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  ); //option this part if u want send full data to user except password n refreshtoken u have to write this

  // send cookies
  const options = {
    //everybody change the cookies but if http n secure :true after that only server can modified the cookies
    httpOnly: true,
    secure: true,
  };

  // response return - in response we return both tokens n cookies n loggedinuser
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshtoken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully!!"
      )
    );
});

// logout steps:
//clear cookies and refreshtoken
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new apiResponse(200, {}, "User Logged Out Successfully"));
});

// make refresh and accesstoken end point so after that user can hit any api or any end page
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incommingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or Used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

// change password:
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "password change successfully"));
});

// currentuser details
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

// update user details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email, fullName } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "all fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        //set is mongodb operator to set the value
        fullName: fullName,
        email: email,
      },
    },
    { new: true } //new:true means after update u get updated details
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(200, user, "account details updated successfully"));
});

// avatar files updates
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //single file update so use file not files

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        //set is mongodb operator to set the value
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(), (200, user, "Avatar Update Successfully"));
});

// coverImage files updates
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on CoverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        //set is mongodb operator to set the value
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new apiResponse(), (200, user, "Cover-Image Update Successfully"));
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
