import multer from "multer";

//copy code from npm multer - diskdtorage copy from it
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); //original name thi file store krva
  },
});

export const upload = multer({ storage });
