import multer from "multer";
import path from "path";

// Storage configuration for profile images
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/Profile/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const bannerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/Banner/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});



// File filter for all image formats
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        return cb(new Error("Only image files are allowed!"), false);
    }
};

// Profile image upload
export const uploadProfile = multer({ 
    storage: profileStorage, 
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

export const uploadBanner = multer({ 
    storage: bannerStorage, 
    fileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});
