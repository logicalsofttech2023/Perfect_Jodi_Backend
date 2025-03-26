import Banner from "../models/Banner.js";
import path from "path";
import Policy from "../models/Policy.js";
import Membership from "../models/Membership.js";
import { stat } from "fs";
import Religion from "../models/Religion.js";
import Referral from "../models/Referral.js";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import Feedback from "../models/Feedback.js";
import SuccessStory from "../models/SuccessStory.js";
import { addNotification } from "../utils/AddNotification.js";
import { sendNotification } from "../utils/notification.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import fs from "fs";

export const addBanner = async (req, res) => {
  try {
    const { title, active } = req.body;
    const image = req.file ? req.file.path.split(path.sep).join("/") : "";
    const newBanner = new Banner({ title, image, active });
    await newBanner.save();

    res.status(200).json(newBanner);
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

export const getBannerById = async (req, res) => {
  try {
    const { bannerId } = req.query;

    // Check if bannerId is provided
    if (!bannerId) {
      return res.status(400).json({ message: "Banner ID is required." });
    }

    // Find the banner
    const banner = await Banner.findById(bannerId);

    // Check if banner exists
    if (!banner) {
      return res.status(404).json({ message: "Banner not found." });
    }

    res.status(200).json({ banner });
  } catch (error) {
    console.error("Error fetching banner:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { bannerId, title, active } = req.body;

    // Check if bannerId is provided
    if (!bannerId) {
      return res.status(400).json({ message: "Banner ID is required." });
    }

    // Prepare update object
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (active !== undefined) updateData.active = active;
    if (req.file) {
      updateData.image = req.file.path.split(path.sep).join("/");
    }

    // Find and update the banner
    const updatedBanner = await Banner.findByIdAndUpdate(
      bannerId,
      updateData,
      { new: true } // Return the updated document
    );

    // Check if banner exists
    if (!updatedBanner) {
      return res.status(404).json({ message: "Banner not found." });
    }

    res.status(200).json({
      message: "Banner updated successfully.",
      banner: updatedBanner,
    });
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.body;

    // Check if bannerId is provided
    if (!bannerId) {
      return res.status(400).json({ message: "Banner ID is required." });
    }

    // Find the banner
    const banner = await Banner.findById(bannerId);
    if (!banner) {
      return res.status(404).json({ message: "Banner not found." });
    }

    // Delete the image file if it exists
    if (banner.image) {
      const imagePath = path.resolve(banner.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the banner from the database
    await Banner.findByIdAndDelete(bannerId);

    res.status(200).json({ message: "Banner deleted successfully." });
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({ error: error.message });
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
    const { membershipId, planType, price, status } = req.body;

    if (!price || (!membershipId && !planType)) {
      return res
        .status(400)
        .json({ message: "Missing required fields", status: false });
    }

    let membership;

    if (membershipId) {
      // Update existing membership
      membership = await Membership.findById(membershipId);

      if (!membership) {
        return res
          .status(404)
          .json({ message: "Membership not found", status: false });
      }

      membership.price = price;
      membership.status = status ?? membership.status;
      await membership.save();
      return res
        .status(200)
        .json({ message: "Membership updated", membership, status: true });
    } else {
      // Add new membership
      membership = new Membership({ planType, price, status });
      await membership.save();
      return res
        .status(201)
        .json({ message: "Membership created", membership, status: true });
    }
  } catch (error) {
    console.error("Error in addUpdateMembership:", error);
    res.status(500).json({ message: "Internal server error", status: false });
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
    res.status(200).json({
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
    const { religionName, communities } = req.body;

    // Check if religion already exists
    const existingReligion = await Religion.findOne({ religionName });
    if (existingReligion) {
      return res.status(400).json({ message: "Religion already exists" });
    }

    // Map communities into correct format [{ name: "Community1" }, { name: "Community2" }]
    const formattedCommunities = Array.isArray(communities)
      ? communities.map((community) => ({ name: community }))
      : [];

    // Create new religion
    const religion = new Religion({
      religionName,
      communities: formattedCommunities,
    });

    await religion.save();

    res.status(200).json({ message: "Religion added successfully", religion });
  } catch (error) {
    res.status(500).json({ message: "Error adding religion", error });
  }
};

export const updateReligion = async (req, res) => {
  try {
    const { religionId, religionName, communities } = req.body;

    // Check if the religion exists
    const religion = await Religion.findById(religionId);
    if (!religion) {
      return res.status(404).json({ message: "Religion not found" });
    }

    // Update religion name if provided
    if (religionName) {
      const existingReligion = await Religion.findOne({
        religionName,
        _id: { $ne: religionId },
      });

      if (existingReligion) {
        return res
          .status(400)
          .json({ message: "Another religion with this name already exists" });
      }

      religion.religionName = religionName;
    }

    // Replace communities if provided
    if (Array.isArray(communities)) {
      religion.communities = communities;
    }

    // Save the updated religion
    await religion.save();

    res.status(200).json({
      message: "Religion updated successfully",
      religion,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating religion",
      error: error.message,
    });
  }
};

export const getReligions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const query = search
      ? { religionName: { $regex: search, $options: "i" } }
      : {};

    const religions = await Religion.find(query)
      .select("_id religionName communities")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Religion.countDocuments(query);

    res.status(200).json({
      status: true,
      message: "Religions fetched successfully",
      data: religions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching religions",
      error: error.message,
    });
  }
};

export const getReligionById = async (req, res) => {
  try {
    const { id } = req.query;

    // Find religion by ID
    const religion = await Religion.findById(id);

    if (!religion) {
      return res.status(404).json({
        status: false,
        message: "Religion not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Religion fetched successfully",
      data: religion,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching religion",
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
      return res
        .status(400)
        .json({ message: "Refer amount is required", status: false });
    }

    // Find the only referral document
    const existingReferral = await Referral.findOne();

    if (!existingReferral) {
      return res
        .status(404)
        .json({ message: "No referral document found", status: false });
    }

    // Update the existing referral
    existingReferral.referAmount = referAmount;
    await existingReferral.save();

    res.status(200).json({
      message: "Referral updated successfully",
      status: true,
      referral: existingReferral,
    });
  } catch (error) {
    console.error("Error updating referral:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getReferral = async (req, res) => {
  try {
    // Find the only referral document
    const referral = await Referral.findOne();

    if (!referral) {
      return res
        .status(404)
        .json({ message: "No referral document found", status: false });
    }

    res.status(200).json({
      message: "Referral fetched successfully",
      status: true,
      referral,
    });
  } catch (error) {
    console.error("Error fetching referral:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    // Pagination setup
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build search query
    let query = {
      firstName: { $exists: true, $ne: "" }, // Exclude users with no firstName or empty string
    };
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { userEmail: { $regex: search, $options: "i" } },
          { mobileNumber: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Fetch users with pagination and search
    const users = await User.find(query)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      message: "Users fetched successfully",
      status: true,
      data: users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getContacts = async (req, res) => {
  try {
    // Fetch contacts with pagination and search
    const contacts = await Contact.findOne();

    res.status(200).json({
      status: true,
      contacts,
    });
  } catch (error) {
    console.error("Error in getContacts:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const addOrUpdateContact = async (req, res) => {
  try {
    const { name, email, mobile, message } = req.body;

    // Find existing contact for the user
    let contact = await Contact.findOne();

    if (contact) {
      // Update the existing contact
      contact.name = name;
      contact.email = email;
      contact.mobile = mobile;
      contact.message = message;
      await contact.save();

      res.status(200).json({
        message: "Contact updated successfully",
        status: true,
        contact,
      });
    } else {
      // Create a new contact
      const newContact = new Contact({
        name,
        email,
        mobile,
      });
      await newContact.save();

      res.status(201).json({
        message: "Contact added successfully",
        status: true,
        contact: newContact,
      });
    }
  } catch (error) {
    console.error("Error in addOrUpdateContact:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const addSuccessStory = async (req, res) => {
  try {
    const { name, date, description, partnerId, userId } = req.body;
    const image = req.file ? req.file.path.replace(/\\/g, "/") : "";
    const newSuccessStory = new SuccessStory({
      userId,
      name,
      date,
      description,
      image,
      partnerId,
    });

    await newSuccessStory.save();

    res.status(200).json({
      message: "SuccessStory added successfully",
      status: true,
      successStory: newSuccessStory,
    });
  } catch (error) {
    console.error("Error in addFeedback:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const deleteSuccessStory = async (req, res) => {
  try {
    const { id } = req.body;

    // Check if ID is provided
    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Find the success story by ID
    const successStory = await SuccessStory.findById(id);

    // Check if the success story exists
    if (!successStory) {
      return res
        .status(404)
        .json({ status: false, message: "Success story not found" });
    }

    // Delete the image if it exists
    if (successStory.image) {
      const imagePath = path.join(process.cwd(), successStory.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the success story
    await SuccessStory.findByIdAndDelete(id);

    res.status(200).json({
      status: true,
      message: "Success story deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteSuccessStory:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getSuccessStories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Pagination setup
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch feedbacks with pagination
    const successStory = await SuccessStory.find()
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalSuccessStory = await SuccessStory.countDocuments();

    res.status(200).json({
      status: true,
      successStory,
      totalSuccessStory,
      totalPages: Math.ceil(totalSuccessStory / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error("Error in getFeedbacks:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getSuccessStoryById = async (req, res) => {
  try {
    const { id } = req.query;

    // Check if ID is provided
    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Find the success story by ID
    const successStory = await SuccessStory.findById(id);

    // Check if success story exists
    if (!successStory) {
      return res
        .status(404)
        .json({ status: false, message: "Success story not found" });
    }
    // Fetch male and female users separately
    const maleUsers = await User.find(
      { gender: "Male" },
      "_id firstName lastName"
    );
    const femaleUsers = await User.find(
      { gender: "Female" },
      "_id firstName lastName"
    );

    res.status(200).json({
      status: true,
      message: "Success story fetched successfully",
      successStory,
      maleUsers,
      femaleUsers,
    });
  } catch (error) {
    console.error("Error in getSuccessStoryById:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateSuccessStory = async (req, res) => {
  try {
    const { successStoryId, name, date, description, partnerId, userId } =
      req.body;
    const image = req.file ? req.file.path.replace(/\\/g, "/") : "";

    // Check if the success story exists
    const successStory = await SuccessStory.findById(successStoryId);
    if (!successStory) {
      return res
        .status(404)
        .json({ message: "Success story not found", status: false });
    }

    // Update fields if provided
    if (name) successStory.name = name;
    if (date) successStory.date = date;
    if (description) successStory.description = description;
    if (partnerId) successStory.partnerId = partnerId;
    if (userId) successStory.userId = userId;
    if (image) successStory.image = image;

    await successStory.save();

    res.status(200).json({
      message: "Success story updated successfully",
      status: true,
      successStory,
    });
  } catch (error) {
    console.error("Error in updateSuccessStory:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateUserVerification = async (req, res) => {
  try {
    const { userId, action } = req.body;

    if (!userId || !["active", "deactive"].includes(action)) {
      return res.status(400).json({
        message:
          "Invalid request. Provide userId and action (active/deactive).",
        status: false,
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { adminVerify: action === "active" },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // 🛎️ Send notification (non-blocking)
    const title = `Account ${
      action === "active" ? "Activated" : "Deactivated"
    }`;
    const body =
      action === "active"
        ? "Your account has been activated. You can now login."
        : "Your account has been deactivated. Please contact support for more details.";

    try {
      // 💾 Add notification to DB
      await addNotification(userId, title, body);

      // 📲 Send push notification if token exists
      if (updatedUser.fcmToken) {
        await sendNotification(updatedUser.fcmToken, title, body);
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
    }

    res.status(200).json({
      message: `User account ${
        action === "active" ? "activated" : "deactivated"
      } successfully`,
      status: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getUserIdInAdmin = async (req, res) => {
  try {
    const { userId } = req.query;

    // Populate religionId to get communities, but only select what's needed
    let user = await User.findById(userId)
      .populate({
        path: "religionId",
        select: "religionName communities",
      })
      .select("-otp -otpExpiresAt");

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Extract the community based on communityId
    const community = user.religionId?.communities.find(
      (c) => c._id.toString() === user.communityId?.toString()
    );

    // Remove the full communities list from the response
    const religionData = {
      _id: user.religionId._id,
      religionName: user.religionId.religionName,
    };

    // Check for valid membership
    const hasMembership = !!(user.membership && user.membership.membershipId);

    res.status(200).json({
      message: "User fetched successfully",
      status: true,
      data: {
        ...user.toObject(),
        hasMembership: hasMembership,
        religionId: religionData,
        community: community
          ? { _id: community._id, name: community.name }
          : null,
      },
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const dashboardData = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalFeedbacks = await Feedback.countDocuments();
    const totalSuccessStories = await SuccessStory.countDocuments();
    const totalTransaction = await Transaction.countDocuments();
    const totalNotification = await Notification.countDocuments();

    res.status(200).json({
      status: true,
      totalUsers,
      totalFeedbacks,
      totalSuccessStories,
      totalTransaction,
      totalNotification,
    });
  } catch (error) {
    console.error("Error in dashboardData:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllFeedbackInAdmin = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    // Pagination setup
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { userName: { $regex: search, $options: "i" } },
          { feedbackText: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Fetch feedback with pagination and search
    const feedbacks = await Feedback.find(query)
      .populate("userId")
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const totalFeedbacks = await Feedback.countDocuments(query);

    res.status(200).json({
      message: "Feedback fetched successfully",
      status: true,
      data: feedbacks,
      totalFeedbacks,
      totalPages: Math.ceil(totalFeedbacks / limitNumber),
      currentPage: pageNumber,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getMembershipInAdmin = async (req, res) => {
  try {
    const { userId } = req.query;

    // Fetch user with populated membership
    const user = await User.findById(userId)
      .populate("membership.membershipId")
      .select("membership");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    res.status(200).json({
      message: "Membership fetched successfully",
      status: true,
      userMembership: user.membership,
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

export const getAllLikedProfilesInAdmin = async (req, res) => {
  try {
    const { userId } = req.query;

    // Find the user and populate the liked profiles with religionId
    const user = await User.findById(userId).populate({
      path: "likes",
      populate: {
        path: "religionId",
        select: "religionName communities",
      },
      select: "-password -otp -otpExpiresAt",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const likedProfiles = user.likes.map((profile) => {
      const community = profile.religionId?.communities.find(
        (c) => c._id.toString() === profile.communityId?.toString()
      );

      const religionData = {
        _id: profile.religionId?._id,
        religionName: profile.religionId?.religionName,
      };

      return {
        ...profile.toObject(),
        religionId: religionData,
        community: community
          ? { _id: community._id, name: community.name }
          : null,
        likeCount: profile.likes.length,
      };
    });

    res.status(200).json({
      message: "Liked profiles fetched successfully",
      status: true,
      likedProfiles,
    });
  } catch (error) {
    console.error("Error in getAllLikedProfiles:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getMembershipById = async (req, res) => {
  try {
    const { membershipId } = req.query;

    if (!membershipId) {
      return res.status(400).json({
        message: "Membership ID is required",
        status: false,
      });
    }

    const membership = await Membership.findById(membershipId);

    if (!membership) {
      return res.status(404).json({
        message: "Membership not found",
        status: false,
      });
    }

    res.status(200).json({
      message: "Membership fetched successfully",
      status: true,
      membership,
    });
  } catch (error) {
    console.error("Error fetching membership:", error);
    res.status(500).json({
      message: "Internal Server Error",
      status: false,
      error: error.message,
    });
  }
};

export const getMaleFemaleUsers = async (req, res) => {
  try {
    // Fetch male and female users separately
    const maleUsers = await User.find(
      { gender: "Male" },
      "_id firstName lastName"
    );
    const femaleUsers = await User.find(
      { gender: "Female" },
      "_id firstName lastName"
    );

    res.status(200).json({
      status: true,
      message: "Users fetched successfully",
      maleUsers,
      femaleUsers,
    });
  } catch (error) {
    console.error("Error in getSuccessStoryById:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllTransactionsInAdmin = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    // Search filter - Adjust fields as per your schema
    const searchQuery = search
      ? {
          $or: [
            { transactionId: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
            { type: { $regex: search, $options: "i" } },
            { amount: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Fetch transactions with pagination
    const transactions = await Transaction.find(searchQuery)
      .populate({
        path: "userId",
        select: "_id firstName lastName photos",
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Count total documents for pagination
    const totalTransactions = await Transaction.countDocuments(searchQuery);

    res.status(200).json({
      message: "Transactions fetched successfully",
      status: true,
      transactions,
      currentPage: page,
      totalPages: Math.ceil(totalTransactions / limit),
      totalTransactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};
