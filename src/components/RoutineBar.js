import React, { useState, useEffect, useRef } from "react";
import { View, Animated, Easing, Dimensions, StyleSheet } from "react-native";
import PropTypes from "prop-types";

const RoutineBar = ({
  tasks: actions,
  start,
  invertColors,
  onAnimationDone,
}) => {
  console.log("routeinbar", actions);
  const totalDuration = actions.reduce(
    (acc, routine) => acc + (routine?.delay || 0),
    0
  );
  console.log("routeinbar", totalDuration);
  const screenWidth = Dimensions.get("window").width;
  const barWidth = screenWidth - 32;

  const [isPlaying, setIsPlaying] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const processData = (data) => {
    let lastAction = 0; // Default action for the first delay item if it's the first in the array

    return data.map((item, index) => {
      if ("delay" in item) {
        // For delay items, assign the last action seen or default to 1 if it's the first item
        return { ...item, action: lastAction };
      } else if ("action" in item) {
        // Update lastAction to the current action for future delay items
        lastAction = item.action;
        return item;
      }
    });
  };

  const processedData = processData(actions);

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
        onAnimationDone();
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

RoutineBar.propTypes = {
  tasks: PropTypes.arrayOf(
    PropTypes.shape({
      operation: PropTypes.string,
      duration: PropTypes.number,
    })
  ),
  start: PropTypes.bool,
  invertColors: PropTypes.bool,
};

RoutineBar.defaultProps = {
  tasks: [],
  start: false,
  invertColors: false,
};

export default RoutineBar;
