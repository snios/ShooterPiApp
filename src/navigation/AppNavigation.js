import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import RoutineListScreen from '../screens/RoutineList';
import CreateRoutineScreen from '../screens/CreateRoutineScreen';
import NewRoutineWizardScreen from '../screens/NewRoutineWizardScreen';
import ViewRoutineScreen from '../screens/ViewRoutine';
import EditRoutineScreen from '../screens/EditRoutineScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

const AppNavigation = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="RoutineList" component={RoutineListScreen} />
      <Stack.Screen name="CreateRoutine" component={CreateRoutineScreen} />
      <Stack.Screen name="NewRoutineWizard" component={NewRoutineWizardScreen} />
      <Stack.Screen name="ViewRoutine" component={ViewRoutineScreen} />
      <Stack.Screen name="EditRoutine" component={EditRoutineScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigation;
