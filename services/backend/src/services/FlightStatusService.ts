/**
 * FlightStatusService — polls an external flight data provider and triggers
 * notifications when the status of a tracked flight changes.
 *
 * TODO: Implement polling logic.
 * TODO: Integrate with a real flight data API (e.g. AviationStack, FlightAware).
 * TODO: Emit events / push notifications on status changes.
 */

export class FlightStatusService {
  /** Start polling for all actively tracked flights. */
  start(): void {
    // TODO: schedule periodic polling
  }

  /** Stop the polling loop. */
  stop(): void {
    // TODO: clear polling interval
  }

  /** Check the current status of a single flight. */
  async checkFlight(_flightNumber: string): Promise<void> {
    // TODO: call flight data API and compare with stored status
  }
}
