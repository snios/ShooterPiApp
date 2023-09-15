import React, { useState, useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

const RoutineBar = ({ tasks, start, invertColors }) => {
  const totalDuration = tasks.reduce((acc, routine) => acc + (routine?.duration || 0), 0);
  const screenWidth = Dimensions.get('window').width;
  const barWidth = screenWidth - 32;

  const [isPlaying, setIsPlaying] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (start) {
      setIsPlaying(true);
    }
  }, [start]);

  useEffect(() => {
    if (isPlaying) {
      Animated.timing(animation, {
        toValue: 1,
        duration: totalDuration * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        setIsPlaying(false);
        animation.setValue(0);
      });
    }
  }, [isPlaying]);

  const animatedWidth = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {tasks.map((routine, index) => {
          const color = routine?.operation === 'on' ? (invertColors ? 'red' : 'green') : (invertColors ? 'green' : 'red');
          const widthPercent = `${((routine?.duration || 0) / totalDuration) * 100}%`;
          return (
            <View key={index} style={{ width: widthPercent, height: 30, backgroundColor: color, borderRadius: 10 }} />
          );
        })}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: animatedWidth,
            backgroundColor: 'white',
            borderRadius: 10,
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    height: 30,
    width: Dimensions.get('window').width - 45,
    overflow: 'hidden',
    borderRadius: 10,
    elevation: 3,
    backgroundColor: '#f0f0f0',
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
