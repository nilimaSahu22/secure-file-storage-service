import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env";
import authRoutes from "./routes/auth.routes";
import filesRoutes from "./routes/files.routes";
import shareRoutes from "./routes/share.routes";
import { errorHandler } from "./middleware/errorHandler.middleware";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/share", shareRoutes);

app.use(errorHandler);

export default app;
