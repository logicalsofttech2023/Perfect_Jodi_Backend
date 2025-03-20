import Banner from "../models/Banner.js";
import path from "path";
import Policy from "../models/Policy.js";
import Membership from "../models/Membership.js";
import { stat } from "fs";
import Religion from "../models/Religion.js";
import Referral from "../models/Referral.js";


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
      return res
        .status(200)
        .json({ message: "Membership updated", membership });
    } else {
      // Add new membership
      membership = new Membership({ planType, price, status });
      await membership.save();
      return res
        .status(201)
        .json({ message: "Membership created", membership });
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
      return res
        .status(404)
        .json({ message: "Membership not found", status: false });
    }
    res
      .status(200)
      .json({
        message: "Membership fetched successfully",
        status: true,
        membership,
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};

export const addReligion = async (req, res) => {
  try {
    const { religionName } = req.body;
    const existingReligion = await Religion.findOne({ religionName });

    if (existingReligion) {
      return res.status(400).json({ message: "Religion already exists" });
    }

    const religion = new Religion({ religionName, communities: [] });
    await religion.save();

    res.status(201).json({ message: "Religion added successfully", religion });
  } catch (error) {
    res.status(500).json({ message: "Error adding religion", error });
  }
};

export const addCommunity = async (req, res) => {
  try {
    const { religionId, communityNames } = req.body; // Expecting an array of names

    if (!Array.isArray(communityNames) || communityNames.length === 0) {
      return res
        .status(400)
        .json({
          message: "Community names should be an array with at least one value",
        });
    }

    const religion = await Religion.findById(religionId);
    if (!religion) {
      return res.status(404).json({ message: "Religion not found" });
    }

    // Filter out existing communities to avoid duplicates
    const existingCommunities = religion.communities.map((c) => c.name);
    const newCommunities = communityNames
      .filter((name) => !existingCommunities.includes(name))
      .map((name) => ({ name }));

    if (newCommunities.length === 0) {
      return res
        .status(400)
        .json({ message: "All communities already exist in this religion" });
    }

    // Add new communities and save
    religion.communities.push(...newCommunities);
    await religion.save();

    res
      .status(201)
      .json({ message: "Communities added successfully", religion });
  } catch (error) {
    res.status(500).json({ message: "Error adding communities", error });
  }
};

export const getReligions = async (req, res) => {
  try {
    const religions = await Religion.find().select(
      "_id religionName communities"
    );

    res.status(200).json({
      status: true,
      message: "Religions fetched successfully",
      data: religions,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching religions",
      error: error.message,
    });
  }
};

export const getCommunitiesByReligion = async (req, res) => {
  try {
    const { religionId } = req.query;

    if (!religionId) {
      return res.status(400).json({
        status: false,
        message: "Religion ID is required",
      });
    }

    const religion = await Religion.findById(religionId).select(
      "communities name"
    );

    if (!religion) {
      return res.status(404).json({
        status: false,
        message: "Religion not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Communities fetched successfully",
      religionName: religion.name,
      data: religion.communities,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching communities",
      error: error.message,
    });
  }
};

export const addReferral = async (req, res) => {
  try {
    const { referAmount } = req.body;

    if (!referAmount) {
      return res.status(400).json({ message: "Refer amount is required", status: false });
    }

    const newReferral = new Referral({ referAmount });
    await newReferral.save();

    res
      .status(201)
      .json({ message: "Referral transaction added", status: true, referral: newReferral });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};