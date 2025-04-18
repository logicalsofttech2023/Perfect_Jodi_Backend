import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import path from "path";
import admin from "firebase-admin";


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
connectDB();

// Make uploads folder publicly accessible
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Initialize Firebase
const serviceAccount = path.join(__dirname, "perfect-jodi-firebase.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
