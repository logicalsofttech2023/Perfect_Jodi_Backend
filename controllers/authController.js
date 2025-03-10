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
};

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

    const photos = req.files
      ? req.files.map((file) => file.path.split(path.sep).join("/"))
      : [];

    let user = await User.findOne({ mobileNumber });
    if (!user || !user.isVerified) {
      return res
        .status(400)
        .json({ message: "User not verified", status: false });
    }

    if (user.email) {
      return res
        .status(400)
        .json({ message: "User already register", status: false });
    }

    // Check if another user exists with the same email
    let existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Email is already in use", status: false });
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
