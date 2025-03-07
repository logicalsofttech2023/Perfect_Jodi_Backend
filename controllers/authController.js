import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.js";
import path from "path";

const generateJwtToken = (user) => {
  return jwt.sign(
    { id: user._id, mobileNumber: user.mobileNumber, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};;

const generateFourDigitOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a random 4-digit number
};

export const generateOtp = async (req, res) => {
  try {
    const { mobileNumber, countryCode } = req.body;
    if (!mobileNumber || !countryCode) {
      return res.status(400).json({
        message: "mobileNumber,countryCode number is required",
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
        message: "mobileNumber number and country code are required",
        status: false,
      });
    }

    let user = await User.findOne({ mobileNumber, countryCode });
    if (!user) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    const generatedOtp = generateFourDigitOtp();
    user.otp = generatedOtp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    res
      .status(200)
      .json({ message: "OTP resent successfully", status: true, data: user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
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
      password,
      profileFor,
    } = req.body;

    const photos = req.files ? req.files.map(file => file.path.split(path.sep).join("/")) : [];

    let user = await User.findOne({ mobileNumber });
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "User not verified", status: false });
    }

    if (!firstName || !lastName || !password || !email || !mobileNumber || !profileFor) {
      return res.status(400).json({
        message: "firstName, lastName, profileFor, email and password are required",
        status: false,
      });
    }

    // Hash the password before savin
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user fields
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
      isVerified: false,
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

export const login = async (req, res) => {
  try {
    const { mobileOrEmail, password } = req.body;

    if (!mobileOrEmail || !password) {
      return res.status(400).json({ message: "Mobile/Email and Password are required", status: false });
    }

    // Find user by email or mobile number
    let user = await User.findOne({
      $or: [{ email: mobileOrEmail }, { mobileNumber: mobileOrEmail }],
    });

    if (!user) {
      return res.status(400).json({ message: "User not found", status: false });
    }

    // Compare hashed password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid credentials", status: false });
    }

    // Generate JWT token
    const token = generateJwtToken(user);

    res.status(200).json({
      message: "Login successful",
      status: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Server Error", status: false });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, dob, gender, maritalStatus } = req.body;

    // Fixing profile image path
    const profileImage = req.file
      ? req.file.path.split(path.sep).join("/")
      : "";

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (maritalStatus) user.maritalStatus = maritalStatus;
    if (profileImage) user.profileImage = profileImage;

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
    let user = await User.findById(userId).select("-otp -otpExpiresAt"); // Exclude sensitive fields
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }

    res
      .status(200)
      .json({ message: "User fetched successfully", status: true, data: user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", status: false });
  }
};
