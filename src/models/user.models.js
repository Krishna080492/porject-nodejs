import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bycrpt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is Required"],
      unique: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

//hooks : after install jwt n bcrypt open mongoose site - middleware - pre
userSchema.pre("save", async function (next) {
  //password change or update kriye tyare j bcrypt kare otherwise next pr jtu rehse
  if (this.isModified("password")) {
    this.password = await bycrpt.hash(this.password, 10); //when user save the file password will be encrypted
    next();
  } else {
    return next();
  }
});

// methods : create method for compare password
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// after jwt section write in .env file -
userSchema.methods.generateAccessToken = function () {
  //create token - .sign()
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, //object - excess token expiry
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id, //refresh token always refresh so we can use only id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
