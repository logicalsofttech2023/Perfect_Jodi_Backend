import express from "express";
import { uploadBanner } from "../middleware/uploadMiddleware.js";
import { addBanner, getBanners } from "../controllers/adminController.js";

const router = express.Router();

router.post("/addBanner", uploadBanner.single("image"), addBanner);

router.get("/getBanners", getBanners);

export default router;
