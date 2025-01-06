import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import React from 'react';
// NavigationContainer - “root”-containeren for al navigation i appen
// createNativeStackNavigator - laver Stack Navigator (screen-stack)
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import komponenter
import LoginScreen from './screens/Auth/LoginScreen';
import SignupScreen from './screens/Auth/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import AddEventScreen from './screens/Event/AddEventScreen';
import DayEventsScreen from './screens/Event/DayEventsScreen';
import EventDetailsScreen from './screens/Event/EventDetailsScreen';
import GroupsScreen from './screens/Auth/GroupsScreen';
import GroupListScreen from './screens/Auth/GroupListScreen';
import DayViewScreen from './screens/Event/DayViewScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import GroupMembersScreen from './screens/Group/GroupMembersScreen';

// Opretter "Stack" ved kald createNativeStackNavigator
const Stack = createNativeStackNavigator();

/**
 * App:
 *  - Pakker hele navigation ind i NavigationContainer.
 *  - Bruger <Stack.Navigator> definere en stak-baseret navigation
 *    skærme (Login, Signup, Home, etc.) = “ruter”.
 * 
 * Stack Navigator:
 *  - Kan hoppe mellem skærme (Login → Signup → GroupList → Home → etc.), 
 *  - og har altid en "historik" (stack)
 * 
 * initialRouteName="Login":
 *  -første skærm, brugeren ser, er “Login”.
 */
export default function App() {
  return (
    <NavigationContainer>
      {/* Stack.Navigator: definerer stakken af skærme */}
      <Stack.Navigator initialRouteName="Login">

        {/* Auth Screens */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Groups"
          component={GroupsScreen}
          options={{ title: 'Gruppeindstillinger' }}
        />
        <Stack.Screen
          name="GroupList"
          component={GroupListScreen}
          options={{ title: 'Dine Grupper' }}
        />

        {/* Main App Screens */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddEvent"
          component={AddEventScreen}
          options={{ title: 'Ny Aftale' }}
        />
        <Stack.Screen
          name="DayEvents"
          component={DayEventsScreen}
          options={{ title: 'Dagens Aftaler' }}
        />
        <Stack.Screen
          name="EventDetails"
          component={EventDetailsScreen}
          options={{ title: 'Aftale Detaljer' }}
        />
        <Stack.Screen
          name="DayView"
          component={DayViewScreen}
          options={{ title: 'Dagsvisning' }}
        />
        <Stack.Screen
          name="GroupChat"
          component={GroupChatScreen}
          options={{ title: 'Gruppe Chat' }}
        />
        <Stack.Screen
          name="GroupMembers"
          component={GroupMembersScreen}
          options={{ title: 'Medlemmer' }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
