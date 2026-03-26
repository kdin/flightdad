/**
 * Flight routes.
 * TODO: Implement each handler — query a flight data provider, cache results,
 *       and return a standardised Flight object from @flightdad/shared.
 */

import { Router, Request, Response } from "express";
import { FlightItinerary } from "@flightdad/shared";

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
router.post("/itinerary", (req: Request, res: Response) => {
  const body = req.body as FlightItinerary;
  const missing: string[] = [];

  if (!body.bookingReference) missing.push("bookingReference");
  if (!body.bookedAt) missing.push("bookedAt");
  if (!body.contactEmail) missing.push("contactEmail");
  if (!Array.isArray(body.passengers) || body.passengers.length === 0)
    missing.push("passengers (must be a non-empty array)");
  if (!Array.isArray(body.flights) || body.flights.length === 0)
    missing.push("flights (must be a non-empty array)");
  if (body.totalPrice === undefined || body.totalPrice === null)
    missing.push("totalPrice");
  if (!body.currency) missing.push("currency");

  if (missing.length > 0) {
    res
      .status(400)
      .json({ message: "Missing or invalid required fields", missing });
    return;
  }

  // TODO: Post itinerary to database.
  res.status(201).json({ message: "Itinerary received", data: body });
});

export default router;
