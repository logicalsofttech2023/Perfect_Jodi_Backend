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

const generateJwtToken = (user) => {
  return jwt.sign(
    { id: user._id, mobileNumber: user.mobileNumber, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
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
    const { mobileNumber, countryCode, email } = req.body;
    if (!mobileNumber || !countryCode || !email) {
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
        email,
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
      email,
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
      !email ||
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

    // Update user field
    Object.assign(user, {
      profileFor,
      age,
      email,
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
    });

    await user.save();
    res.status(200).json({
      message: "User registration completed successfully",
      status: true,
      data: user,
    });
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
      $or: [{ email: mobileOrEmail }, { mobileNumber: mobileOrEmail }],
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
    if (!user.adminVerify) {
      if (user.fcmToken) {
        // Send notification if not admin verified
        await sendNotification(
          user.fcmToken,
          "Verification Pending",
          "Your profile is not verified yet. Please wait for admin approval."
        );
      }

      return res.status(403).json({
        message:
          "Your profile is not verified yet. Please wait for admin approval.",
        status: false,
      });
    }

    // Generate JWT token
    const token = generateJwtToken(user);

    res.status(200).json({
      message: "Login successful",
      status: true,
      data: user,
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
      email,
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
    if (email) user.email = email;
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

    let user = await User.findById(userId)
      .populate("religionId", "religionName")
      .populate("communityId", "name")
      .select("-otp -otpExpiresAt");

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Check for valid membership
    const hasMembership = !!(user.membership && user.membership.membershipId);

    res.status(200).json({
      message: "User fetched successfully",
      status: true,
      data: {
        ...user.toObject(),
        hasMembership: hasMembership,
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

    let profile = await User.findById(userId);
    if (!profile) {
      return res
        .status(404)
        .json({ message: "Profile not found", status: false });
    }

    // Check if user has already liked the profile
    const likeIndex = profile.likes.indexOf(profileId);

    if (likeIndex === -1) {
      // If user has NOT liked the profile, add like
      profile.likes.push(profileId);
      var message = "Profile liked successfully";
    } else {
      // If user has already liked, remove like (Unlike feature)
      profile.likes.splice(likeIndex, 1);
      var message = "Profile unlike successfully";
    }

    await profile.save();

    res.status(200).json({
      message,
      status: true,
      likeCount: profile.likes.length,
    });
  } catch (error) {
    console.error("Error in likeProfile:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllLikedProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the user and populate the liked profiles
    const user = await User.findById(userId).populate(
      "likes",
      "-password -otp"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    res.status(200).json({
      message: "Liked profiles fetched successfully",
      status: true,
      likedProfiles: user.likes,
    });
  } catch (error) {
    console.error("Error in getAllLikedProfiles:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const getAllProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const loggedInUser = await User.findById(userId).select("religion likes");
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const userReligion = loggedInUser.religion;
    const likedProfiles = loggedInUser.likes.map((id) => String(id));

    let profiles = await User.find({
      isVerified: true,
      religion: userReligion,
      _id: { $ne: userId },
    })
      .select("-otp -otpExpiresAt -password")
      .lean();

    profiles = profiles.map((profile) => ({
      ...profile,
      isLiked: likedProfiles.includes(String(profile._id)),
      likeCount: profile.likes.length,
    }));

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

    const loggedInUser = await User.findById(userId).select("religion likes");
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const { religion, likes } = loggedInUser;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "Location not set", status: false });
    }

    let profiles = await User.find({
      isVerified: true,
      religion: religion,
      _id: { $ne: userId },
    })
      .select("-otp -otpExpiresAt -password")
      .lean();

    const likedProfiles = likes.map((id) => String(id));

    profiles = profiles
      .filter((profile) => {
        if (!profile.latitude || !profile.longitude) return false;

        return geolib.isPointWithinRadius(
          { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
          {
            latitude: parseFloat(profile.latitude),
            longitude: parseFloat(profile.longitude),
          },
          30000 // 30 km radius
        );
      })
      .map((profile) => ({
        ...profile,
        isLiked: likedProfiles.includes(String(profile._id)),
        likeCount: profile.likes.length,
      }));

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
    const { search } = req.query;

    // Return empty response if no search parameter is provided
    if (!search) {
      return res.status(200).json({
        status: true,
        profiles: [],
      });
    }

    const loggedInUser = await User.findById(userId).select("likes");
    if (!loggedInUser) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    const likedProfiles = loggedInUser.likes.map((id) => String(id));

    const filters = {
      isVerified: true,
      _id: { $ne: userId },
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { religion: { $regex: search, $options: "i" } },
        { community: { $regex: search, $options: "i" } },
        { gender: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    let profiles = await User.find(filters)
      .select("-otp -otpExpiresAt -password")
      .lean();

    profiles = profiles.map((profile) => ({
      ...profile,
      isLiked: likedProfiles.includes(String(profile._id)),
      likeCount: profile.likes.length,
    }));

    res.status(200).json({
      status: true,
      profiles,
    });
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

