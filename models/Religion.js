import mongoose from "mongoose";

const CommunitySchema = new mongoose.Schema({
  name: { type: String }
});

const ReligionSchema = new mongoose.Schema({
  religionName: { type: String },
  communities: [CommunitySchema]
});

export default mongoose.model("Religion", ReligionSchema);
