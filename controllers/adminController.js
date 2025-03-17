import Banner from "../models/Banner.js";
import path from "path";

export const addBanner = async (req, res) => {
  try {
    const { title, active } = req.body;
    const image = req.file ? req.file.path.split(path.sep).join("/") : "";
    const newBanner = new Banner({ title, image, active });
    await newBanner.save();

    res.status(201).json(newBanner);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find();
    res.status(200).json({
      message: "Banner fetch successfully",
      status: true,
      banners,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
  }
};
