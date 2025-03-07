import express from "express";
import { generateOtp, verifyOtp, resendOtp, completeRegistration, updateProfile, getUserById, login } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { uploadProfile  } from "../middleware/uploadMiddleware.js";


const router = express.Router();

router.post("/generateOtp", generateOtp);
router.post("/verifyOtp", verifyOtp);
router.post("/resendOtp", resendOtp);
router.post("/completeRegistration", uploadProfile.array("photos", 20), completeRegistration);
router.post("/login", login);

router.post("/updateProfile", authMiddleware, uploadProfile.array("photos", 20), updateProfile);
router.get("/getUserById",authMiddleware, getUserById);

export default router;
