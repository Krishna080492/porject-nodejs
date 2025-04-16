// file handling
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration - copy from cloudinry site
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// upload file on cloudinary
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (localFilePath) {
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto", //file type select auto so it recognize which file is comming img or pdf etc...
      });
      //file success uploaded
      console.log("file is uploaded on cloudinary", response.url);
      fs.unlinkSync(localFilePath);
      return response;
    } else {
      return null;
    }
    //if file upload failed it generate error and remove file from server
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved temp. file as the upload operation got failed
    return null;
  }
};

export { uploadOnCloudinary };
