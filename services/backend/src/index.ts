/**
 * flightdad backend entry point.
 *
 * Responsibilities (to be implemented):
 *  - Flight status polling & push notifications
 *  - Check-in orchestration
 *  - REST API consumed by the mobile app
 */

import express from "express";
import config from "./config";
import flightRoutes from "./routes/flights";
import checkinRoutes from "./routes/checkin";
import notificationRoutes from "./routes/notifications";
import notifyRoutes from "./routes/notify";

const app = express();
const PORT = config.port;

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "flightdad-backend" });
});

// ─── Route mounting ───────────────────────────────────────────────────────────
app.use("/flights", flightRoutes);
app.use("/checkin", checkinRoutes);
app.use("/notifications", notificationRoutes);
app.use("/notify", notifyRoutes);

export default app;

// ─── Server start (skipped when imported by tests or Lambda) ─────────────────
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`flightdad backend listening on port ${PORT}`);
  });

  // Graceful shutdown.
  const shutdown = (): void => {
    server.close(() => process.exit(0));
    // Force exit if the server doesn't close within 5 seconds.
    setTimeout(() => process.exit(1), 5_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

