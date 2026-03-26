/**
 * AppNavigator — root navigation stack for the mobile app.
 * TODO: Wire up all screens once React Navigation is fully configured.
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import FlightStatusScreen from "../screens/FlightStatusScreen";
import CheckInScreen from "../screens/CheckInScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

export type RootStackParamList = {
  Home: undefined;
  FlightStatus: { flightNumber: string };
  CheckIn: { flightId: string };
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "My Flights" }} />
        <Stack.Screen name="FlightStatus" component={FlightStatusScreen} options={{ title: "Flight Status" }} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ title: "Check In" }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
