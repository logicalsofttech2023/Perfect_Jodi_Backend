import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    photos: [{ type: String, require: true }],
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
    religion: {
      type: String,
      enum: [
        "Hindu",
        "Muslim",
        "Christian",
        "Sikh",
        "Jain",
        "Buddhist",
        "Other",
      ],
    },
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
    email: { type: String },
    password: { type: String },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    firebaseToken: { type: String },
    adminVerify: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
