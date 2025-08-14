import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import AppNavigation from "./src/navigation/AppNavigation";
import { ShooterAPIProvider } from "./src/contexts/ShooterAPIContext";
import { RecoilRoot } from "recoil";
import { PromptProvider } from "./src/hooks/PromptProvider";
import { WifiBindingProvider } from "./src/contexts/WifiBindingProvider";

export default function App() {
  return (
    <RecoilRoot>
      <NavigationContainer>
        <PromptProvider>
        <WifiBindingProvider targetSsid="D1Mini_AP" autoBind>
          <ShooterAPIProvider>
            <AppNavigation />
          </ShooterAPIProvider>
          </WifiBindingProvider>
        </PromptProvider>
      </NavigationContainer>
    </RecoilRoot>
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
