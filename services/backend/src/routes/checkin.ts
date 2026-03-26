/**
 * Check-in routes.
 * TODO: Implement check-in orchestration — call airline API, generate
 *       boarding pass, and return a CheckIn object from @flightdad/shared.
 */

import { Router } from "express";

const router = Router();

/** POST /checkin — initiate check-in for a flight. */
router.post("/", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

/** GET /checkin/:flightId — retrieve check-in status for a flight. */
router.get("/:flightId", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

export default router;
