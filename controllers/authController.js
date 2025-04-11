import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.js";
import path from "path";
import Banner from "../models/Banner.js";
import { isPointWithinRadius } from "geolib";
import Policy from "../models/Policy.js";
import Membership from "../models/Membership.js";
import { stat } from "fs";
import crypto from "crypto";
import Transaction from "../models/Transaction.js";
import Religion from "../models/Religion.js";
import Feedback from "../models/Feedback.js";
import Contact from "../models/Contact.js";
import { sendNotification } from "../utils/notification.js";
import SuccessStory from "../models/SuccessStory.js";
import geolib from "geolib";
import { addNotification } from "../utils/AddNotification.js";
import Notification from "../models/Notification.js";
import RecentView from "../models/RecentView.js";
import Referral from "../models/Referral.js";

const generateJwtToken = (user) => {
  return jwt.sign(
    { id: user._id, mobileNumber: user.mobileNumber, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "730d" }
  );
};
const generateFourDigitOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a random 4-digit number
};
const generateReferralId = () => {
  const uniquePart = crypto.randomBytes(3).toString("hex").toUpperCase(); // Random 6 characters
  return `PJ${uniquePart}`;
};
const generateTransactionId = () => {
  const randomString = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 characters
  const formattedId = `PJ${randomString.match(/.{1,2}/g).join("")}`; // PJ + split into 2-char groups
  return formattedId;
};

export const generateOtp = async (req, res) => {
  try {
    const { mobileNumber, countryCode } = req.body;
    if (!mobileNumber || !countryCode) {
      return res.status(400).json({
        message: "mobileNumber,countryCode,email is required",
        status: false,
      });
    }

    let user = await User.findOne({ mobileNumber });

    const generatedOtp = generateFourDigitOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (user) {
      user.otp = generatedOtp;
      user.otpExpiresAt = otpExpiresAt;
    } else {
      user = new User({
        mobileNumber,
        countryCode,
        otp: generatedOtp,
        otpExpiresAt,
      });
    }
    await user.save();

    res.status(200).json({
      message: "OTP generated successfully",
      status: true,
      data: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { mobileNumber, countryCode, otp } = req.body;

    if (!mobileNumber || !countryCode || !otp) {
      return res.status(400).json({
        message: "mobileNumber,countryCode,otp are required",
        status: false,
      });
    }
    let user = await User.findOne({ mobileNumber, countryCode });

    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", status: false });
    }

    if (new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ message: "OTP expired", status: false });
    }

    user.otpExpiresAt = "";
    user.isVerified = true;
    await user.save();

    res.status(200).json({
      message: "OTP verified successfully",
      status: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { mobileNumber, countryCode } = req.body;

    if (!mobileNumber || !countryCode) {
      return res.status(400).json({
        message: "Mobile number and country code are required",
        status: false,
      });
    }
    let user = await User.findOne({ mobileNumber, countryCode });

    if (!user) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    if (typeof generateFourDigitOtp !== "function") {
      console.error("generateFourDigitOtp function is not defined!");
      return res
        .status(500)
        .json({ message: "OTP generation error", status: false });
    }

    const generatedOtp = generateFourDigitOtp();

    user.otp = generatedOtp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    res.status(200).json({
      message: "OTP resent successfully",
      status: true,
      data: user,
    });
  } catch (error) {
    console.error("Error in resendOtp:", error);
    res
      .status(500)
      .json({ message: "Server Error", status: false, error: error.message });
  }
};

export const completeRegistration = async (req, res) => {
  try {
    const {
      userEmail,
      age,
      firstName,
      lastName,
      dob,
      gender,
      height,
      weight,
      address,
      city,
      state,
      pincode,
      maritalStatus,
      highestQualification,
      yourWork,
      annualIncome,
      bio,
      fatherName,
      fatherOccupation,
      motherName,
      noOfSisters,
      noOfBrothers,
      mobileNumber,
      countryCode,
      password,
      profileFor,
      latitude,
      longitude,
      referredBy,
      religionId,
      communityId,
    } = req.body;

    // Validate Religion ID
    const religion = await Religion.findById(religionId);
    if (!religion) {
      return res
        .status(400)
        .json({ message: "Invalid religion ID", status: false });
    }

    // Validate Community ID (from nested communities)
    const community = religion.communities.id(communityId);
    if (!community) {
      return res
        .status(400)
        .json({ message: "Invalid community ID", status: false });
    }

    const referAmount = await Referral.findOne();
    if (!referAmount) {
      return res
        .status(400)
        .json({ message: "Referral amount not set", status: false });
    }

    // Inside completeRegistration function
    const referralId = generateReferralId(mobileNumber);

    // Check if referredBy exists in the system
    let referrer = null;
    if (referredBy) {
      referrer = await User.findOne({ referralId: referredBy });
      if (!referrer) {
        return res
          .status(400)
          .json({ message: "Invalid referral code", status: false });
      }

      // Add referral amount to referrer's wallet
      referrer.wallet += referAmount.referAmount;
      await referrer.save();
    }
    const photos = req.files
      ? req.files.map((file) => file.path.split(path.sep).join("/"))
      : [];

    let user = await User.findOne({ mobileNumber });
    if (!user || !user.isVerified) {
      return res
        .status(400)
        .json({ message: "User not verified", status: false });
    }

    if (
      !firstName ||
      !lastName ||
      !password ||
      !userEmail ||
      !mobileNumber ||
      !profileFor
    ) {
      return res.status(400).json({
        message:
          "firstName, lastName, profileFor, email and password are required",
        status: false,
      });
    }

    // Hash the password before saving
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const membershipID = await Membership.findOne({ planType: "monthly" });

    // Get total user count
    const userCount = await User.countDocuments();

    let membership = null;

    // If the user count is less than 1000, give free monthly membership
    if (userCount < 1000) {
      const startDate = new Date();
      let endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      membership = {
        planType: "monthly",
        startDate,
        endDate,
        membershipId: membershipID._id,
      };
    }

    // Update user field
    Object.assign(user, {
      profileFor,
      age,
      userEmail,
      firstName,
      lastName,
      gender,
      dob,
      religion,
      height,
      weight,
      address,
      city,
      state,
      pincode,
      maritalStatus,
      highestQualification,
      yourWork,
      annualIncome,
      bio,
      fatherName,
      fatherOccupation,
      motherName,
      countryCode,
      noOfSisters,
      noOfBrothers,
      photos: photos || user.photos,
      password: hashedPassword,
      latitude,
      longitude,
      referralId,
      referredBy: referrer ? referrer._id : null,
      religionId: religionId,
      communityId: communityId,
      membership,
    });

    const newUser = await user.save();
    if (newUser) {
      const token = generateJwtToken(newUser);
      const hasMembership = false;
      res.status(200).json({
        message: "User registration completed successfully",
        status: true,
        data: {
          ...user.toObject(),
          hasMembership: hasMembership,
        },
        token,
      });
    }
  } catch (error) {
    console.error("Error in completeRegistration:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const resetPassword = async (req, res) => {
  const userId = req.user.id;
  try {
    const { oldPassword, newPassword } = req.body;

    // Validate inputs
    if (!userId || !oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "All fields are required", status: false });
    }

    // Find user by userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Check if old password matches
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Old password is incorrect", status: false });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user's password
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
      status: true,
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const login = async (req, res) => {
  try {
    const { mobileOrEmail, password, fcmToken } = req.body;

    if (!mobileOrEmail) {
      return res
        .status(400)
        .json({ message: "Mobile/Email are required", status: false });
    }

    // Find user by email or mobile number
    let user = await User.findOne({
      $or: [{ userEmail: mobileOrEmail }, { mobileNumber: mobileOrEmail }],
    });

    if (!user) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    if (password) {
      // Compare hashed password if password is provided
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        return res
          .status(400)
          .json({ message: "Invalid credentials", status: false });
      }
    }

    // Update FCM Token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    // Check admin verification status
    // if (user.adminVerify) {
    //   if (user.fcmToken) {
    //     // Send notification if not admin verified
    //     await sendNotification(
    //       user.fcmToken,
    //       "Verification Pending",
    //       "Your profile is not verified yet. Please wait for admin approval."
    //     );
    //   }

    //   return res.status(403).json({
    //     message:
    //       "Your profile is not verified yet. Please wait for admin approval.",
    //     status: false,
    //   });
    // }

    // Generate JWT token
    const token = generateJwtToken(user);

    const hasMembership = !!(user.membership && user.membership.membershipId);

    res.status(200).json({
      message: "Login successful",
      status: true,
      data: {
        ...user.toObject(),
        hasMembership: hasMembership,
      },
      token: token,
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      userEmail,
      age,
      firstName,
      lastName,
      dob,
      gender,
      religion,
      height,
      weight,
      address,
      city,
      state,
      pincode,
      maritalStatus,
      highestQualification,
      yourWork,
      annualIncome,
      bio,
      fatherName,
      fatherOccupation,
      motherName,
      noOfSisters,
      noOfBrothers,
      mobileNumber,
      countryCode,
      profileFor,
    } = req.body;

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Update fields
    if (userEmail) user.userEmail = userEmail;
    if (age) user.age = age;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (religion) user.religion = religion;
    if (height) user.height = height;
    if (weight) user.weight = weight;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;
    if (maritalStatus) user.maritalStatus = maritalStatus;
    if (highestQualification) user.highestQualification = highestQualification;
    if (yourWork) user.yourWork = yourWork;
    if (annualIncome) user.annualIncome = annualIncome;
    if (bio) user.bio = bio;
    if (fatherName) user.fatherName = fatherName;
    if (fatherOccupation) user.fatherOccupation = fatherOccupation;
    if (motherName) user.motherName = motherName;
    if (noOfSisters) user.noOfSisters = noOfSisters;
    if (noOfBrothers) user.noOfBrothers = noOfBrothers;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (countryCode) user.countryCode = countryCode;
    if (profileFor) user.profileFor = profileFor;

    await user.save();

    res
      .status(200)
      .json({ message: "Profile updated successfully", status: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req.user.id;

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
        religionId: religionData, // Send religion only
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

export const generateForgotPasswordOtp = async (req, res) => {
  try {
    const { mobileOrEmail } = req.body;

    if (!mobileOrEmail) {
      return res
        .status(400)
        .json({ message: "Mobile/Email are required", status: false });
    }

    // Find user by email or mobile number
    let user = await User.findOne({
      $or: [{ email: mobileOrEmail }, { mobileNumber: mobileOrEmail }],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not Found",
        status: false,
      });
    }

    const generatedOtp = generateFourDigitOtp();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = generatedOtp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    res.status(200).json({
      message: "OTP generated successfully",
      status: true,
      otp: generatedOtp,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { mobileOrEmail, otp } = req.body;

    if (!mobileOrEmail) {
      return res
        .status(400)
        .json({ message: "Mobile/Email are required", status: false });
    }

    if (!otp) {
      return res.status(400).json({
        message: "OTP is required",
        status: false,
      });
    }

    // Find user by email or mobile number
    let user = await User.findOne({
      $or: [{ email: mobileOrEmail }, { mobileNumber: mobileOrEmail }],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
        status: false,
      });
    }

    if (!user.otpExpiresAt || new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({
        message: "OTP expired",
        status: false,
      });
    }

    // OTP verify hone ke baad usko null set karo taake dubara use na ho
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({
      message: "OTP verified successfully",
      status: true,
      data: user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { mobileOrEmail, newPassword, confirmPassword } = req.body;

    if (!mobileOrEmail) {
      return res
        .status(400)
        .json({ message: "Mobile/Email are required", status: false });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "New password and confirm password are required",
        status: false,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
        status: false,
      });
    }

    // Find user by email or mobile number
    let user = await User.findOne({
      $or: [{ email: mobileOrEmail }, { mobileNumber: mobileOrEmail }],
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: "Password updated successfully",
      status: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: "Profile image is required", status: false });
    }

    // Fixing profile image paths
    const photos = req.files.map((file) => file.path.split(path.sep).join("/"));

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Purani images ko delete mat karo, naye images ko add karo
    user.photos = [...user.photos, ...photos];
    await user.save();

    res.status(200).json({
      message: "Profile images updated successfully",
      status: true,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imagePath } = req.body;

    if (!imagePath) {
      return res
        .status(400)
        .json({ message: "Image path is required", status: false });
    }

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Check if image exists in user's photos array
    const imageIndex = user.photos.indexOf(imagePath);
    if (imageIndex === -1) {
      return res.status(400).json({
        message: "Image not found in user's photos",
        status: false,
      });
    }

    // Remove the image from the array
    user.photos.splice(imageIndex, 1);
    await user.save();

    res.status(200).json({
      message: "Profile image deleted successfully",
      status: true,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const addMoneyToWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    let { amount } = req.body;

    // Convert amount to number
    amount = parseFloat(amount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount", status: false });
    }

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Ensure wallet is a number
    user.wallet = Number(user.wallet) + amount;
    await user.save();

    // Generate unique transaction ID using crypto
    const transactionId = generateTransactionId();

    // Create a new transaction record
    const transaction = new Transaction({
      userId,
      amount,
      type: "addMoney",
      status: "success",
      transactionId,
      description: `Added ₹${amount} to wallet`,
    });

    await transaction.save();

    // 🛎️ Send notification
    const title = "Wallet Amount Added";
    const body = `₹${amount} has been added to your wallet. Your new balance is ₹${user.wallet}.`;

    try {
      // 💾 Add notification to DB
      await addNotification(userId, title, body);

      // 📲 Send push notification if token exists
      if (user.fcmToken) {
        await sendNotification(user.fcmToken, title, body);
      }
    } catch (notificationError) {
      console.error("Notification Error:", notificationError);
      // Notification fail hone par bhi success response bhej rahe hain
    }

    res.status(200).json({
      message: `₹${amount} added to wallet successfully`,
      status: true,
      walletBalance: user.wallet,
      transaction,
    });
  } catch (error) {
    console.error("Error in addMoneyToWallet:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const likeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.body;

    if (!profileId) {
      return res
        .status(400)
        .json({ message: "Profile ID is required", status: false });
    }

    if (userId === profileId) {
      return res
        .status(400)
        .json({ message: "You cannot like your own profile", status: false });
    }

    // Find the user who is liking the profile
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Ensure likes is an array
    if (!Array.isArray(user.likes)) {
      user.likes = [];
    }

    // Find the profile being liked/unliked
    const profile = await User.findById(profileId);
    if (!profile) {
      return res
        .status(404)
        .json({ message: "Profile not found", status: false });
    }

    // Check if already liked
    const likeIndex = user.likes.indexOf(profileId);
    let message = "";

    if (likeIndex === -1) {
      // Like profile
      user.likes.push(profileId);
      message = "Profile liked successfully";

      // 🛎️ Send notification only on LIKE
      const title = "New Like!";
      const body = `${user.firstName} ${user.lastName} liked your profile.`;

      // 💾 Add notification to DB
      await addNotification(profileId, title, body);

      // 📲 Send push notification if token exists
      if (profile.fcmToken) {
        await sendNotification(profile.fcmToken, title, body);
      }
    } else {
      // Unlike profile
      user.likes.splice(likeIndex, 1);
      message = "Profile unliked successfully";
    }

    await user.save();

    res.status(200).json({
      message,
      status: true,
      likeCount: user.likes.length,
    });
  } catch (error) {
    console.error("Error in likeProfile:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllLikedProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

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

export const getAllProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const loggedInUser = await User.findById(userId).select(
      "religionId likes gender blockedUsers"
    );
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const userReligion = loggedInUser.religionId;
    const likedProfiles = loggedInUser.likes.map((id) => String(id));
    const genderPreference = loggedInUser.gender === "Male" ? "Female" : "Male";
    const blockedByUser = loggedInUser.blockedUsers.map((id) => id.toString());

    // Get users who have blocked the logged-in user
    const blockedYou = await User.find({ blockedUsers: userId }).select("_id");
    const blockedYouIds = blockedYou.map((u) => u._id.toString());

    const excludedIds = [...blockedByUser, ...blockedYouIds];

    let profiles = await User.find({
      isVerified: true,
      adminVerify: true,
      _id: { $ne: userId, $nin: excludedIds },
      gender: genderPreference,
      religionId: userReligion,
      
    })
      .populate({
        path: "religionId",
        select: "religionName communities",
      })
      .select("-otp -otpExpiresAt -password")
      .lean();

    profiles = profiles.map((profile) => {
      const community = profile.religionId?.communities.find(
        (c) => c._id.toString() === profile.communityId?.toString()
      );

      const religionData = {
        _id: profile.religionId?._id,
        religionName: profile.religionId?.religionName,
      };

      return {
        ...profile,
        isLiked: likedProfiles.includes(String(profile._id)),
        likeCount: profile.likes.length,
        religionId: religionData,
        community: community
          ? { _id: community._id, name: community.name }
          : null,
      };
    });

    res.status(200).json({
      status: true,
      profiles,
    });
  } catch (error) {
    console.error("Error in getAllProfiles:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllNearProfiles = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    const userId = req.user.id;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Location not set", status: false });
    }

    const loggedInUser = await User.findById(userId).select(
      "religionId likes gender blockedUsers"
    );
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const userReligion = loggedInUser.religionId;
    const likedProfiles = loggedInUser.likes.map((id) => String(id));
    const genderPreference = loggedInUser.gender === "Male" ? "Female" : "Male";
    const blockedByUser = loggedInUser.blockedUsers.map((id) => id.toString());

    // Find users who have blocked the current user
    const blockedYou = await User.find({ blockedUsers: userId }).select("_id");
    const blockedYouIds = blockedYou.map((u) => u._id.toString());

    const excludedIds = [...blockedByUser, ...blockedYouIds];

    let profiles = await User.find({
      isVerified: true,
      adminVerify: true,
      _id: { $ne: userId, $nin: excludedIds },
      gender: genderPreference,
      religionId: userReligion,
    })
      .populate({
        path: "religionId",
        select: "religionName communities",
      })
      .select("-otp -otpExpiresAt -password")
      .lean();

    profiles = profiles
      .filter((profile) => {
        if (!profile.latitude || !profile.longitude) return false;

        // Check if profile is within 30 km radius
        return geolib.isPointWithinRadius(
          { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
          {
            latitude: parseFloat(profile.latitude),
            longitude: parseFloat(profile.longitude),
          },
          30000 // 30 km radius
        );
      })
      .map((profile) => {
        const community = profile.religionId?.communities.find(
          (c) => c._id.toString() === profile.communityId?.toString()
        );

        const religionData = {
          _id: profile.religionId?._id,
          religionName: profile.religionId?.religionName,
        };

        return {
          ...profile,
          isLiked: likedProfiles.includes(String(profile._id)),
          likeCount: profile.likes.length,
          religionId: religionData,
          community: community
            ? { _id: community._id, name: community.name }
            : null,
        };
      });

    res.status(200).json({
      status: true,
      profiles,
    });
  } catch (error) {
    console.error("Error in getAllNearProfiles:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllBanners = async (req, res) => {
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

export const getAllPolicy = async (req, res) => {
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

export const getMembership = async (req, res) => {
  try {
    const userId = req.user.id;

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

    // Fetch all memberships
    const memberships = await Membership.find();

    res.status(200).json({
      message: "Membership fetched successfully",
      status: true,
      memberships,
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

export const buyMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const { membershipId } = req.body;

    if (!membershipId) {
      return res
        .status(400)
        .json({ message: "Missing required fields", status: false });
    }

    // Fetch membership plan
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res
        .status(404)
        .json({ message: "Membership plan not found", status: false });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Check if user already has an active membership
    if (
      user.membership &&
      user.membership.endDate &&
      new Date(user.membership.endDate) > new Date()
    ) {
      return res.status(400).json({
        message: "You already have an active membership.",
        status: false,
        membership: user.membership,
      });
    }

    // Check if the user has enough balance in the wallet
    if (user.wallet < membership.price) {
      return res.status(400).json({
        message: "Insufficient wallet balance.",
        status: false,
        walletBalance: user.wallet,
      });
    }

    // Deduct membership price from the user's wallet
    user.wallet -= membership.price;

    // Calculate startDate and endDate
    const startDate = new Date();
    let endDate = new Date(startDate);

    if (membership.planType === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (membership.planType === "6months") {
      endDate.setMonth(endDate.getMonth() + 6);
    }

    // Update user's membership
    user.membership = {
      planType: membership.planType,
      startDate,
      endDate,
      membershipId: membership._id,
    };

    await user.save();

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Create a new transaction record
    const transaction = new Transaction({
      userId,
      amount: membership.price,
      type: "subscription",
      status: "success",
      transactionId,
      description: `Purchased ${membership.planType} membership`,
    });

    await transaction.save();

    // 🛎️ Send notification
    const title = "Membership Purchased";
    const body = `You have successfully purchased a ${membership.planType} membership.`;

    try {
      // 💾 Add notification to DB
      await addNotification(userId, title, body);

      // 📲 Send push notification if token exists
      if (user.fcmToken) {
        await sendNotification(user.fcmToken, title, body);
      }
    } catch (notificationError) {
      console.error("Notification Error:", notificationError);
      // Notification fail hone par bhi success response bhej rahe hain
    }

    res.status(201).json({
      message: "Membership purchased successfully",
      walletBalance: user.wallet,
      membership: user.membership,
      transaction,
    });
  } catch (error) {
    console.error("Error in buyMembership:", error);
    res.status(500).json({ message: "Internal server error", status: false });
  }
};

export const getWalletWithTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user with wallet balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Fetch user's transactions, sorted by the most recent
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 }) // Latest transactions first
      .exec();

    res.status(200).json({
      status: true,
      walletBalance: user.wallet,
      transactions,
    });
  } catch (error) {
    console.error("Error in getWalletWithTransactions:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllReligions = async (req, res) => {
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

export const getAllCommunitiesByReligion = async (req, res) => {
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


export const searchProfiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      search,
      minAge,
      maxAge,
      communityId,
      latitude,
      longitude,
      radius,
    } = req.query;

    if (
      !search &&
      !minAge &&
      !maxAge &&
      !latitude &&
      !longitude &&
      !radius &&
      !communityId
    ) {
      return res.status(200).json({
        status: true,
        profiles: [],
      });
    }

    const loggedInUser = await User.findById(userId).select(
      "religionId likes gender blockedUsers"
    );
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const likedProfiles = loggedInUser.likes.map((id) => String(id));
    const blockedByUser = loggedInUser.blockedUsers.map((id) => id.toString());

    // Users who have blocked the logged-in user
    const blockedYou = await User.find({ blockedUsers: userId }).select("_id");
    const blockedYouIds = blockedYou.map((u) => u._id.toString());

    const excludedIds = [...blockedByUser, ...blockedYouIds];

    const userReligion = loggedInUser.religionId;
    const genderPreference = loggedInUser.gender === "Male" ? "Female" : "Male";

    let filters = {
      isVerified: true,
      adminVerify: true,
      _id: { $ne: userId, $nin: excludedIds },
      gender: genderPreference,
      religionId: userReligion,
    };

    // Community Filter
    if (mongoose.Types.ObjectId.isValid(communityId)) {
      filters.communityId = new mongoose.Types.ObjectId(communityId);
    }

    // Search Filters
    if (search) {
      filters.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
      ];
    }

    // Age Filters
    if (minAge || maxAge) {
      filters.$expr = { $and: [] };
      if (minAge) {
        filters.$expr.$and.push({
          $gte: [{ $toInt: "$age" }, parseInt(minAge) ],
        });
      }
      if (maxAge) {
        filters.$expr.$and.push({
          $lte: [{ $toInt: "$age" }, parseInt(maxAge) ],
        });
      }
    }

    let profiles = await User.find(filters)
      .populate({ path: "religionId", select: "religionName communities" })
      .select("-otp -otpExpiresAt -password")
      .lean();

    // Apply Radius Filter
    if (latitude && longitude && radius) {
      profiles = profiles.filter((profile) => {
        if (!profile.latitude || !profile.longitude) return false;
        return geolib.isPointWithinRadius(
          { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
          {
            latitude: parseFloat(profile.latitude),
            longitude: parseFloat(profile.longitude),
          },
          parseInt(radius)
        );
      });
    }

    profiles = profiles.map((profile) => {
      const community = profile.religionId?.communities.find(
        (c) => c._id.toString() === profile.communityId?.toString()
      );

      const religionData = {
        _id: profile.religionId?._id,
        religionName: profile.religionId?.religionName,
      };

      return {
        ...profile,
        isLiked: likedProfiles.includes(String(profile._id)),
        likeCount: profile.likes.length,
        religionId: religionData,
        community: community
          ? { _id: community._id, name: community.name }
          : null,
      };
    });

    res.status(200).json({ status: true, profiles });
  } catch (error) {
    console.error("Error in searchProfiles:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};


export const addFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rating, description } = req.body;

    const newFeedback = new Feedback({
      userId,
      rating,
      description,
    });

    await newFeedback.save();

    res.status(201).json({
      message: "Feedback added successfully",
      status: true,
      feedback: newFeedback,
    });
  } catch (error) {
    console.error("Error in addFeedback:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      message: "Feedbacks fetched successfully",
      feedbacks,
    });
  } catch (error) {
    console.error("Error in getFeedbacks:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: true,
      contacts,
    });
  } catch (error) {
    console.error("Error in getContacts:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getSuccessStories = async (req, res) => {
  try {
    const successStories = await SuccessStory.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: true,
      message: "Success stories fetched successfully",
      successStories,
    });
  } catch (error) {
    console.error("Error in getSuccessStories:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllNotificationsById = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all notifications for the user, sorted by latest first
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      message: "Notifications fetched successfully",
      status: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const saveRecentView = async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user.id;

    if (!profileId) {
      return res
        .status(400)
        .json({ message: "Profile ID is required", status: false });
    }

    // Check if the same view already exists
    const existingView = await RecentView.findOne({
      userId,
      profiles: profileId,
    });
    if (!existingView) {
      await RecentView.create({ userId, profiles: profileId });
    }

    res
      .status(200)
      .json({ message: "Profile viewed successfully", status: true });
  } catch (error) {
    console.error("Error in saveRecentView:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getRecentViews = async (req, res) => {
  try {
    const userId = req.user.id;

    const loggedInUser = await User.findById(userId).select("likes blockedUsers");
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const likedProfiles = loggedInUser.likes.map((id) => String(id));
    const blockedByUser = loggedInUser.blockedUsers.map((id) => id.toString());

    // Users who have blocked the logged-in user
    const blockedYou = await User.find({ blockedUsers: userId }).select("_id");
    const blockedYouIds = blockedYou.map((u) => u._id.toString());

    const excludedIds = [...blockedByUser, ...blockedYouIds];

    const recentViews = await RecentView.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: "profiles",
        select: "-otp -otpExpiresAt -password",
        populate: {
          path: "religionId",
          select: "religionName communities",
        },
      })
      .lean();

    const updatedRecentViews = recentViews
      .filter((view) => {
        const profile = view.profiles;
        if (!profile) return false;
        return !excludedIds.includes(profile._id.toString());
      })
      .map((view) => {
        const profile = view.profiles;

        const community = profile.religionId?.communities.find(
          (c) => c._id.toString() === profile.communityId?.toString()
        );

        const religionData = {
          _id: profile.religionId?._id,
          religionName: profile.religionId?.religionName,
        };

        return {
          ...view,
          profiles: {
            ...profile,
            isLiked: likedProfiles.includes(String(profile._id)),
            likeCount: profile.likes.length,
            religionId: religionData,
            community: community
              ? { _id: community._id, name: community.name }
              : null,
          },
        };
      });

    res.status(200).json({ status: true, recentViews: updatedRecentViews });
  } catch (error) {
    console.error("Error in getRecentViews:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const chatImageUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded", status: false });
    }    

    const chatImage = req.file.path.replace(/\\/g, "/");    

    const updatedUser = await User.findByIdAndUpdate(
      req?.user?.id,
      { chatImage },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    res.status(200).json({
      message: "Image added successfully",
      status: true,
      chatImage: updatedUser.chatImage,
    });
  } catch (error) {
    console.error("Server error", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const blockUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId } = req.body;

    if (!profileId) {
      return res
        .status(400)
        .json({ message: "Profile ID is required", status: false });
    }

    if (userId === profileId) {
      return res
        .status(400)
        .json({ message: "You cannot block yourself", status: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Ensure blockedUsers is an array
    if (!Array.isArray(user.blockedUsers)) {
      user.blockedUsers = [];
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found", status: false });
    }

    const blockIndex = user.blockedUsers.indexOf(profileId);
    let message = "";

    if (blockIndex === -1) {
      // Block the user
      user.blockedUsers.push(profileId);
      message = "User blocked successfully";
    } else {
      // Unblock the user
      user.blockedUsers.splice(blockIndex, 1);
      message = "User unblocked successfully";
    }

    await user.save();

    return res.status(200).json({
      message,
      status: true,
      blockedCount: user.blockedUsers.length,
    });
  } catch (error) {
    console.error("Error in blockUser:", error);
    return res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllBlockedProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate({
      path: "blockedUsers",
      populate: {
        path: "religionId",
        select: "religionName communities",
      },
      select: "-password -otp -otpExpiresAt",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const blockedProfiles = user.blockedUsers.map((profile) => {
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
        blockCount: profile.blockedUsers.length,
      };
    });

    res.status(200).json({
      message: "Blocked profiles fetched successfully",
      status: true,
      blockedProfiles,
    });
  } catch (error) {
    console.error("Error in getAllBlockedProfiles:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};



