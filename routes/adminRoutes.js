import express from "express";
import { uploadBanner } from "../middleware/uploadMiddleware.js";
import { addBanner, getBanners, policyUpdate, getPolicy, addUpdateMembership, getAllMembership, addReligion, addCommunity, getReligions, getCommunitiesByReligion, addReferral } from "../controllers/adminController.js";

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

export default router;
