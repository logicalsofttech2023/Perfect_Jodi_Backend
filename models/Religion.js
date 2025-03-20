import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const ReligionSchema = new mongoose.Schema({
  religionName: { type: String, required: true, unique: true },
  communities: [CommunitySchema]
});

export default mongoose.model("Religion", ReligionSchema);
