import express from "express";
import { generateOtp, verifyOtp, resendOtp, completeRegistration, updateProfile, getUserById, login, generateForgotPasswordOtp, verifyForgotPasswordOtp, updatePassword, updateProfileImage, deleteProfileImage, addMoneyToWallet, likeProfile, getAllProfiles, getAllBanners, getAllNearProfiles, getAllPolicy, getMembership, buyMembership, getAllLikedProfiles, getWalletWithTransactions, resetPassword } from "../controllers/authController.js";
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
router.post("/generateForgotPasswordOtp", generateForgotPasswordOtp);
router.post("/verifyForgotPasswordOtp", verifyForgotPasswordOtp);
router.post("/updatePassword", updatePassword);

router.post("/updateProfileImage", authMiddleware, uploadProfile.array("photos", 20), updateProfileImage);
router.post("/deleteProfileImage", authMiddleware, uploadProfile.array("photos", 20), deleteProfileImage);

router.post("/addMoneyToWallet", authMiddleware, addMoneyToWallet);
router.post("/likeProfile", authMiddleware, likeProfile);
router.get("/getAllProfiles",authMiddleware, getAllProfiles);
router.get("/getAllBanners", getAllBanners);
router.get("/getAllNearProfiles",authMiddleware, getAllNearProfiles);
router.get("/getAllPolicy",authMiddleware, getAllPolicy);
router.get("/getMembership", getMembership);
router.post("/buyMembership", authMiddleware, buyMembership);
router.get("/getAllLikedProfiles",authMiddleware, getAllLikedProfiles);
router.get("/getWalletWithTransactions", authMiddleware, getWalletWithTransactions);
router.post("/resetPassword", authMiddleware, resetPassword);




export default router;
