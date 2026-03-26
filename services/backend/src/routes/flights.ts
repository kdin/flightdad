/**
 * Flight routes.
 * TODO: Implement each handler — query a flight data provider, cache results,
 *       and return a standardised Flight object from @flightdad/shared.
 */

import { Router } from "express";
import db from "../db";
import { FlightItinerarySchema } from "../schemas/itinerary";
import type { FlightItineraryInput } from "../schemas/itinerary";

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
 * Persists the itinerary to the configured database.
 */
router.post("/itinerary", async (req, res) => {
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

  const itinerary = await db
    .collection<FlightItineraryInput>("itineraries")
    .insert(result.data);

  res.status(201).json({ message: "Itinerary received", data: itinerary });
});

export default router;
