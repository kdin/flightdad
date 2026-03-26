/**
 * Flight routes.
 * TODO: Implement each handler — query a flight data provider, cache results,
 *       and return a standardised Flight object from @flightdad/shared.
 */

import { Router } from "express";
import db from "../db";
import { FlightItinerarySchema } from "../schemas/itinerary";
import type { ItineraryRecord } from "../schemas/itinerary";

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
 * Requires an `x-user-id` header that uniquely identifies the submitting user.
 * Persists the itinerary to the configured database, adding a `timeToQuery`
 * timestamp (native Date) for time-range queries.
 */
router.post("/itinerary", async (req, res) => {
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ message: "Missing or invalid x-user-id header" });
    return;
  }

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

  const record: ItineraryRecord = {
    ...result.data,
    userId,
    timeToQuery: new Date(),
    journeyStatus: "PENDING",
  };

  const itinerary = await db
    .collection<ItineraryRecord>("itineraries")
    .insert(record);

  res.status(201).json({ message: "Itinerary received", data: itinerary });
});

export default router;
