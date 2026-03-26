/**
 * flightdad backend entry point.
 *
 * Responsibilities (to be implemented):
 *  - Flight status polling & push notifications
 *  - Check-in orchestration
 *  - REST API consumed by the mobile app
 */

import express from "express";
import flightRoutes from "./routes/flights";
import checkinRoutes from "./routes/checkin";
import notificationRoutes from "./routes/notifications";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "flightdad-backend" });
});

// ─── Route mounting ───────────────────────────────────────────────────────────
app.use("/flights", flightRoutes);
app.use("/checkin", checkinRoutes);
app.use("/notifications", notificationRoutes);

app.listen(PORT, () => {
  console.log(`flightdad backend listening on port ${PORT}`);
});

export default app;
