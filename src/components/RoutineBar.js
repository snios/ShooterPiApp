import React, { useState, useEffect, useRef } from "react";
import { View, Animated, Easing, Dimensions, StyleSheet } from "react-native";

const RoutineBar = ({
  tasks = [],
  start = false,
  invertColors = false,
  onAnimationDone,
}) => {
  const totalDuration = tasks.reduce(
    (acc, routine) => acc + (routine?.delay || 0),
    0
  );

  const screenWidth = Dimensions.get("window").width;

  const [isPlaying, setIsPlaying] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const processData = (data) => {
    let lastAction = 0;

    return data.map((item) => {
      if ("delay" in item) {
        return { ...item, action: lastAction };
      } else if ("action" in item) {
        lastAction = item.action;
        return item;
      } else {
        return item;
      }
    });
  };

  const processedData = processData(tasks);

  useEffect(() => {
    if (start) {
      setIsPlaying(true);
    }
  }, [start]);

  useEffect(() => {
    if (isPlaying) {
      Animated.timing(animation, {
        toValue: 1,
        duration: totalDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        setIsPlaying(false);
        onAnimationDone?.(); // optional chaining in case it's undefined
        animation.setValue(0);
      });
    }
  }, [isPlaying]);

  const animatedWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {processedData.map((action, index) => {
          const color =
            action?.action === 0
              ? invertColors
                ? "red"
                : "green"
              : invertColors
              ? "green"
              : "red";

          const widthPercent = `${
            ((action?.delay || 0) / totalDuration) * 100
          }%`;

          return (
            <View
              key={index}
              style={{
                width: widthPercent,
                height: 30,
                backgroundColor: color,
                borderRadius: 10,
              }}
            />
          );
        })}

        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: animatedWidth,
            backgroundColor: "white",
            borderRadius: 10,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    flexDirection: "row",
    height: 30,
    width: Dimensions.get("window").width - 45,
    overflow: "hidden",
    borderRadius: 10,
    elevation: 3,
    backgroundColor: "#f0f0f0",
  },
});

export default RoutineBar;
