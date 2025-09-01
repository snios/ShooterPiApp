import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

export type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: "default" | "underline" | "outline";
};

export function ThemedInput({
  style,
  lightColor,
  darkColor,
  variant = "default",
  ...rest
}: ThemedInputProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "border");

  return (
    <TextInput
      style={[
        { color, backgroundColor },
        variant === "default" && styles.default,
        variant === "underline" && [
          styles.underline,
          { borderBottomColor: borderColor },
        ],
        variant === "outline" && [styles.outline, { borderColor }],
        style,
      ]}
      placeholderTextColor={useThemeColor({}, "placeholder")}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    padding: 10,
    fontSize: 16,
    borderRadius: 8,
  },
  underline: {
    paddingVertical: 8,
    fontSize: 16,
    borderBottomWidth: 1,
  },
  outline: {
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
});
