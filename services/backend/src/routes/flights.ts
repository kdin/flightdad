/**
 * Flight routes.
 * TODO: Implement each handler — query a flight data provider, cache results,
 *       and return a standardised Flight object from @flightdad/shared.
 */

import { Router } from "express";

const router = Router();

/** GET /flights/:flightNumber — retrieve current status for a flight. */
router.get("/:flightNumber", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

/** GET /flights — list all tracked flights for the authenticated user. */
router.get("/", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

export default router;
