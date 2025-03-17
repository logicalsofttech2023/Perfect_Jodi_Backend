import express from "express";
import { uploadBanner } from "../middleware/uploadMiddleware.js";
import { addBanner, getBanners, policyUpdate, getPolicy, addUpdateMembership, getAllMembership } from "../controllers/adminController.js";

const router = express.Router();

router.post("/addBanner", uploadBanner.single("image"), addBanner);

router.get("/getBanners", getBanners);

router.get("/getPolicy", getPolicy);

router.post("/policyUpdate", policyUpdate);

router.post("/addUpdateMembership", addUpdateMembership);

router.get("/getAllMembership", getAllMembership);



export default router;
