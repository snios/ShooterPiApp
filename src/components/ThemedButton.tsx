// components/ThemedButton.tsx
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
  type PressableProps,
} from "react-native";
import { ThemedText } from "./ThemedText";

export type ThemedButtonProps = Omit<PressableProps, "style"> & {
  title?: string; // valfritt; kan annars använda children
  variant?: "solid" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  lightColor?: string; // override för primärfärgen i ljust läge
  darkColor?: string; // override för primärfärgen i mörkt läge
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
};

export function ThemedButton({
  title,
  children,
  variant = "solid",
  size = "md",
  loading = false,
  disabled,
  lightColor,
  darkColor,
  style,
  textStyle,
  onPress,
  ...rest
}: ThemedButtonProps) {
  // Primär “tint” används som knappfärg i temat
  const tint = useThemeColor({ light: lightColor, dark: darkColor }, "tint");
  const bg = useThemeColor({}, "background");
  const text = useThemeColor({}, "text");

  const sizes = {
    sm: { pv: 8, ph: 12, radius: 10, font: 14 },
    md: { pv: 12, ph: 16, radius: 12, font: 16 },
    lg: { pv: 16, ph: 20, radius: 14, font: 18 },
  }[size];

  // Färger per variant
  const backgroundColor = variant === "solid" ? tint : "transparent";

  const borderColor = variant === "outline" ? tint : "transparent";

  const labelColor =
    variant === "solid" ? bg : variant === "link" ? "#0a7ea4" : tint;

  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={
        variant !== "link" ? { color: tint, borderless: false } : undefined
      }
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: sizes.pv,
          paddingHorizontal: sizes.ph,
          borderRadius: sizes.radius,
          backgroundColor,
          borderColor,
          borderWidth: variant === "outline" ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: isDisabled ? 0.6 : pressed ? 0.8 : 1,
        },
        variant === "ghost" && styles.ghostShadow,
        style,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <ThemedText
          type="defaultSemiBold"
          style={[
            { color: labelColor, fontSize: sizes.font, textAlign: "center" },
            variant === "link" && styles.linkSpacing,
            textStyle,
          ]}
        >
          {title ?? children}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  ghostShadow: {
    // lite “tap target” även när bakgrunden är transparent
    borderWidth: 0,
  },
  linkSpacing: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
});
