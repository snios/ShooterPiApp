import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import AppNavigation from "./src/navigation/AppNavigation";
import { ShooterAPIProvider } from "./src/contexts/ShooterAPIContext";
import { RecoilRoot } from "recoil";
import { PromptProvider } from "./src/hooks/PromptProvider";
import { WifiBindingProvider } from "./src/contexts/WifiBindingProvider";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function App() {
  const colorScheme = useColorScheme();
  // const [loaded] = useFonts({
  //   SpaceMono: require("../assets/_global/fonts/SpaceMono-Regular.ttf"),
  // });
  const loaded = true;

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
    <RecoilRoot>
      <NavigationContainer>
        <PromptProvider>
        <WifiBindingProvider targetSsid="D1Mini_AP" autoBind={false}autoConnect={false}>
          <ShooterAPIProvider>
            <AppNavigation />
          </ShooterAPIProvider>
          </WifiBindingProvider>
        </PromptProvider>
      </NavigationContainer>
    </RecoilRoot>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
