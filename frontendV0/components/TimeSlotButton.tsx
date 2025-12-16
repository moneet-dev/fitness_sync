import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface TimeSlotButtonProps {
  time: string;
  isSelected: boolean;
  onPress: () => void;
  style?: any;
}

export const TimeSlotButton: React.FC<TimeSlotButtonProps> = ({
  time,
  isSelected,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSelected && styles.selectedButton,
        style,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.buttonText,
          isSelected && styles.selectedButtonText,
        ]}
      >
        {time}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    flex: 1,
    minWidth: 80,
  },
  selectedButton: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedButtonText: {
    color: 'white',
  },
});
