import Banner from "../models/Banner.js";
import path from "path";
import Policy from "../models/Policy.js";
import Membership from "../models/Membership.js";
import { stat } from "fs";

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

export const policyUpdate = async (req, res) => {
  try {
    const { type, content } = req.body;
    if (!type || !content) {
      return res
        .status(400)
        .json({ message: "Type and content are required", status: false });
    }

    let policy = await Policy.findOne({ type });
    if (policy) {
      policy.content = content;
      await policy.save();
      return res
        .status(200)
        .json({ message: "Policy updated successfully", status: true, policy });
    } else {
      policy = new Policy({ type, content });
      await policy.save();
      return res
        .status(200)
        .json({ message: "Policy created successfully", status: true, policy });
    }
  } catch (error) {
    console.error("Error updating policy:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};

export const getPolicy = async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res
        .status(400)
        .json({ message: "Policy type is required", status: false });
    }

    const policy = await Policy.findOne({ type });
    if (!policy) {
      return res
        .status(404)
        .json({ message: "Policy not found", status: false });
    }

    res
      .status(200)
      .json({ message: "Policy fetched successfully", status: true, policy });
  } catch (error) {
    console.error("Error fetching policy:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};

export const addUpdateMembership = async (req, res) => {
  try {
    const { planType, price, status } = req.body;

    if (!planType || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let membership = await Membership.findOne({ planType });

    if (membership) {
      // Update existing membership
      membership.price = price;
      membership.status = status || membership.status;
      await membership.save();
      return res.status(200).json({ message: "Membership updated", membership });
    } else {
      // Add new membership
      membership = new Membership({ planType, price, status });
      await membership.save();
      return res.status(201).json({ message: "Membership created", membership });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllMembership = async (req, res) => {
  try {
    const membership = await Membership.find();
    if (!membership) {
      return res.status(404).json({ message: "Membership not found", status: false });
    }
    res.status(200).json({ message: "Membership fetched successfully", status: true, membership });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};
