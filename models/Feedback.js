import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: String },
    description: { type: String },
    reply: [{ type: String }],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
