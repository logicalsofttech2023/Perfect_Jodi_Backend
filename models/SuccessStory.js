import mongoose from "mongoose";

const successStorySchema = new mongoose.Schema(
  {
    image: { type: String },
    name: { type: String },
    date: { type: Date, default: Date.now },
    description: { type: String },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const SuccessStory = mongoose.model("SuccessStory", successStorySchema);
export default SuccessStory;
