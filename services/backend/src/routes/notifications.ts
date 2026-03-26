/**
 * Notification routes.
 * TODO: Integrate with a push notification provider (e.g. Firebase FCM /
 *       Expo Notifications) and store notification history.
 */

import { Router } from "express";

const router = Router();

/** GET /notifications — list notifications for the authenticated user. */
router.get("/", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

/** POST /notifications/subscribe — register a device push token. */
router.post("/subscribe", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

export default router;
