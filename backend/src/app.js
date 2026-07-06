import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import rankRoutes from "./routes/rank.js";
import flashcardRoutes from "./routes/flashcard.js";
import userRoutes from "./routes/user.js";
import configRoutes from "./routes/config.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/rank", rankRoutes);
app.use("/api/flashcard", flashcardRoutes);
app.use("/api/user", userRoutes);
app.use("/api/config", configRoutes);

app.get("/health", (req, res) => {
  res.send("OK");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
