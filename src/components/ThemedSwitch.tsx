import { Switch, Platform } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

type ThemedSwitchProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  // valfritt
  onColor?: string;
  offColor?: string;
  thumbColor?: string;
  testID?: string;
};

export function ThemedSwitch({
  value,
  onValueChange,
  disabled,
  onColor,
  offColor,
  thumbColor,
  testID,
}: ThemedSwitchProps) {
  const tint = useThemeColor({}, "tint");
  const bg = useThemeColor({}, "background");
  const border = useThemeColor({}, "border" as any); // om du la till 'border' i Colors
  const icon = useThemeColor({}, "icon");

  const trackOn = onColor ?? tint;
  const trackOff =
    offColor ?? (Platform.OS === "ios" ? "#767577" : border ?? "#ccc");
  const thumb = thumbColor ?? (value ? bg : "#f4f3f4");

  return (
    <Switch
      testID={testID}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      // iOS
      ios_backgroundColor={trackOff}
      // Android
      trackColor={{ false: trackOff, true: trackOn }}
      thumbColor={Platform.OS === "android" ? thumb : undefined}
    />
  );
}
