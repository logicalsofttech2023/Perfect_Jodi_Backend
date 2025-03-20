import mongoose from "mongoose";

const referralTransactionSchema = new mongoose.Schema(
    {
        referAmount: { type: Number, required: true },
    },
    { timestamps: true }
  );

  const Referral = mongoose.model("Referral", referralTransactionSchema);
  export default Referral;