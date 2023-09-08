import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import usePinsApi from '../apis/PinsApi'
import useRoutinesApi from '../apis/RoutineApi';

const ShooterAPIContext = createContext();

export const ShooterAPIProvider = ({ children }) => {
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('SERVER_URL')
      .then((url) => {
        // Use the fetched URL or fallback to the default URL
        setServerUrl(url || 'http://YOUR_DEFAULT_SERVER_URL');
      })
      .catch((error) => {
        console.error('Error fetching server URL:', error);
      });
  }, []);

  // Store url if changed..
  useEffect(() => {
    if (serverUrl) {
      // Optionally, you can save the server URL to AsyncStorage
      AsyncStorage.setItem('SERVER_URL', serverUrl).catch((error) => {
        console.error('Error saving server URL:', error);
      });
    }
  }, [serverUrl]);

    // Initialize the APIs with the server URL
    const routinesApi = useRoutinesApi(serverUrl);
    const pinsApi = usePinsApi(serverUrl);

  return (
    <ShooterAPIContext.Provider value={{ routinesApi, pinsApi, setServerUrl, serverUrl }}>
      {children}
    </ShooterAPIContext.Provider>
  );
};

export const useShooterApiContext = () => {
  const context = useContext(ShooterAPIContext);
  if (!context) {
    throw new Error('useShooterApiContext must be used within a ShooterAPIProvider');
  }
  return context;
};
