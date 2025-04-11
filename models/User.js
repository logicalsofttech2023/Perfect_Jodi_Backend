import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    photos: [{ type: String, require: true }],
    wallet: { type: Number, default: 0 },
    profileFor: {
      type: String,
      enum: [
        "mySelf",
        "mySon",
        "myDaughter",
        "myBrother",
        "mySister",
        "myFriend",
      ],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    firstName: { type: String },
    lastName: { type: String },
    dob: { type: Date },
    age: { type: String },
    height: { type: Number },
    weight: { type: Number },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
    },
    highestQualification: { type: String },
    yourWork: { type: String },
    annualIncome: { type: String },
    bio: { type: String },
    fatherName: { type: String },
    fatherOccupation: { type: String },
    motherName: { type: String },
    noOfSisters: { type: Number, default: 0 },
    noOfBrothers: { type: Number, default: 0 },
    mobileNumber: { type: String, unique: true },
    countryCode: { type: String },
    userEmail: { type: String },
    password: { type: String },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    firebaseToken: { type: String },
    adminVerify: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    latitude: { type: String },
    longitude: { type: String },
    membership: {
      planType: { type: String, enum: ["monthly", "6months"] },
      startDate: { type: Date },
      endDate: { type: Date },
      membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "Membership" },
    },
    referralId: { type: String },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fcmToken: { type: String },
    religionId: { type: mongoose.Schema.Types.ObjectId, ref: "Religion" },
    communityId: { type: mongoose.Schema.Types.ObjectId },
    chatImage: { type: String },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
