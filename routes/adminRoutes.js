import express from "express";
import { uploadBanner } from "../middleware/uploadMiddleware.js";
import { addBanner, getBanners, policyUpdate, getPolicy, addUpdateMembership, getAllMembership, addReligion, addCommunity, getReligions, getCommunitiesByReligion, addReferral, getAllUsers, addOrUpdateContact, addSuccessStory } from "../controllers/adminController.js";

import { uploadProfile } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/addBanner", uploadBanner.single("image"), addBanner);

router.get("/getBanners", getBanners);

router.get("/getPolicy", getPolicy);

router.post("/policyUpdate", policyUpdate);

router.post("/addUpdateMembership", addUpdateMembership);

router.get("/getAllMembership", getAllMembership);

router.post("/addReligion", addReligion);

router.post("/addCommunity", addCommunity);

router.get("/getReligions", getReligions);

router.get("/getCommunitiesByReligion", getCommunitiesByReligion);

router.post("/addReferral", addReferral);

router.get("/getAllUsers", getAllUsers);

router.post("/addOrUpdateContact", addOrUpdateContact);

router.post("/addSuccessStory",uploadProfile.single("image"), addSuccessStory);


export default router;
