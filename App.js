import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import AppNavigation from "./src/navigation/AppNavigation";
import { ShooterAPIProvider } from "./src/contexts/ShooterAPIContext";
import { RecoilRoot } from "recoil";
import { PromptProvider } from "./src/hooks/PromptProvider";

export default function App() {
  return (
    <RecoilRoot>
      <NavigationContainer>
        <PromptProvider>
          <ShooterAPIProvider>
            <AppNavigation />
          </ShooterAPIProvider>
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
