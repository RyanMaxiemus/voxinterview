import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import express from "express";
import cors from "cors";
import analyzeRoute from "./routes/analyze.js";
import interviewRoutes from "./routes/interview.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/analyze", analyzeRoute);
app.use("/interview", interviewRoutes);
app.use("/uploads", express.static("uploads"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
