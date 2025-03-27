import express from "express";
import { uploadBanner } from "../middleware/uploadMiddleware.js";
import { addBanner, getBanners, policyUpdate, getPolicy, addUpdateMembership, getAllMembership, addReligion, updateReligion, getReligions, getCommunitiesByReligion, addReferral, getAllUsers, addOrUpdateContact, addSuccessStory, updateUserVerification, getUserIdInAdmin, dashboardData, getAllFeedbackInAdmin, getMembershipInAdmin, getAllLikedProfilesInAdmin, updateBanner, deleteBanner, getBannerById, getReferral, getMembershipById, getContacts, getReligionById, getSuccessStories, getSuccessStoryById, updateSuccessStory, getMaleFemaleUsers, deleteSuccessStory, getAllTransactionsInAdmin, getMembershipStats, getRevenueStats, getUserReligionStats, adminSignup, adminLogin } from "../controllers/adminController.js";

import { uploadProfile } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/addBanner", uploadBanner.single("image"), addBanner);

router.get("/getBanners", getBanners);

router.get("/getPolicy", getPolicy);

router.post("/policyUpdate", policyUpdate);

router.post("/addUpdateMembership", addUpdateMembership);

router.get("/getAllMembership", getAllMembership);

router.post("/addReligion", addReligion);

router.post("/updateReligion", updateReligion);

router.get("/getReligions", getReligions);

router.get("/getCommunitiesByReligion", getCommunitiesByReligion);

router.post("/addReferral", addReferral);

router.get("/getAllUsers", getAllUsers);

router.post("/addOrUpdateContact", addOrUpdateContact);

router.post("/addSuccessStory",uploadProfile.single("image"), addSuccessStory);


router.post("/updateUserVerification", updateUserVerification);

router.get("/getUserIdInAdmin", getUserIdInAdmin);

router.get("/dashboardData", dashboardData);

router.get("/getAllFeedbackInAdmin", getAllFeedbackInAdmin);

router.get("/getMembershipInAdmin", getMembershipInAdmin);

router.get("/getAllLikedProfilesInAdmin", getAllLikedProfilesInAdmin);

router.post("/updateBanner", uploadProfile.single("image"), updateBanner);

router.post("/deleteBanner", deleteBanner);

router.get("/getBannerById", getBannerById);

router.get("/getReferral", getReferral);

router.get("/getMembershipById", getMembershipById);

router.get("/getContacts", getContacts);

router.get("/getReligionById", getReligionById);

router.get("/getSuccessStories", getSuccessStories);

router.get("/getSuccessStoryById", getSuccessStoryById);

router.post("/updateSuccessStory",uploadProfile.single("image"), updateSuccessStory);

router.get("/getMaleFemaleUsers", getMaleFemaleUsers);

router.post("/deleteSuccessStory", deleteSuccessStory);

router.get("/getAllTransactionsInAdmin", getAllTransactionsInAdmin);

router.get("/getMembershipStats", getMembershipStats);

router.get("/getRevenueStats", getRevenueStats);

router.get("/getUserReligionStats", getUserReligionStats);

router.post("/adminSignup", adminSignup);

router.post("/adminLogin", adminLogin);


export default router;
