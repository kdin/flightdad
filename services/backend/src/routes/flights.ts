/**
 * Flight routes.
 * TODO: Implement each handler — query a flight data provider, cache results,
 *       and return a standardised Flight object from @flightdad/shared.
 */

import { Router } from "express";
import { FlightItinerarySchema } from "../schemas/itinerary";

const router = Router();

/** GET /flights/:flightNumber — retrieve current status for a flight. */
router.get("/:flightNumber", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

/** GET /flights — list all tracked flights for the authenticated user. */
router.get("/", (_req, res) => {
  res.status(501).json({ message: "Not implemented" });
});

/**
 * POST /flights/itinerary — submit a flight itinerary parsed from a
 * confirmation email.
 *
 * TODO: Persist the itinerary to the database.
 */
router.post("/itinerary", (req, res) => {
  const result = FlightItinerarySchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid itinerary payload",
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  // TODO: Post itinerary to database.
  res.status(201).json({ message: "Itinerary received", data: result.data });
});

export default router;
