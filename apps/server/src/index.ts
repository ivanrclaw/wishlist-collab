import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { AppDataSource } from "./config/database";
import { authRouter } from "./routes/auth";
import { wishlistRouter } from "./routes/wishlists";
import { itemRouter } from "./routes/items";
import { scrapeRouter } from "./routes/scrape";

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(
  rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true })
);
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/wishlists", wishlistRouter);
app.use("/api/items", itemRouter);
app.use("/api/scrape", scrapeRouter);

// Serve frontend in production
const frontendPath = path.join(__dirname, "../../web/dist");
app.use(express.static(frontendPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start
AppDataSource.initialize()
  .then(() => {
    console.log("📦 Database connected");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

export default app;
