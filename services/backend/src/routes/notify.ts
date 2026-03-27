/**
 * Notify routes.
 *
 * POST /notify — receive a list of (flight number, user id) pairs for
 * processing.  Currently a stub that prints the input; future iterations
 * will dispatch push notifications via a provider such as Firebase FCM.
 *
 * Called by the background itinerary worker after it identifies due records.
 */

import { Router } from "express";
import { NotifyRequestSchema } from "../schemas/notify";
import { notifyService } from "../services/NotifyService";

const router = Router();

/**
 * POST /notify — accept a list of (flight number, user id) pairs.
 *
 * Request body: an array of objects, each with `flightNumber` and `userId`.
 *
 * Returns 200 on success, 400 if the payload is invalid.
 */
router.post("/", (req, res) => {
  const result = NotifyRequestSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid notify payload",
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  notifyService.notify(result.data);

  res.status(200).json({ message: "Notifications received", count: result.data.length });
});

export default router;
