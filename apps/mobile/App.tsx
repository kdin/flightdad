/**
 * Root application component — mounts the navigation stack.
 *
 * Navigation structure (screens are in src/screens/):
 *  - HomeScreen           — dashboard with upcoming flights
 *  - FlightStatusScreen   — real-time status & gate info
 *  - CheckInScreen        — guided check-in flow
 *  - NotificationsScreen  — alert history
 */

import React from "react";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App(): React.JSX.Element {
  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
