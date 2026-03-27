/**
 * Zod schemas for the POST /notify endpoint.
 */

import { z } from "zod";

/** A single (flight number, user id) pair to be notified. */
export const NotifyPairSchema = z.object({
  flightNumber: z.string().min(1),
  userId: z.string().min(1),
});

/** The request body for POST /notify — a non-empty list of notify pairs. */
export const NotifyRequestSchema = z.array(NotifyPairSchema).nonempty();

export type NotifyPair = z.infer<typeof NotifyPairSchema>;
export type NotifyRequest = z.infer<typeof NotifyRequestSchema>;
