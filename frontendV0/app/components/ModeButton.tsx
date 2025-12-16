import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ModeButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  style?: any;
}

export const ModeButton: React.FC<ModeButtonProps> = ({
  icon,
  label,
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
      <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
      <Ionicons
          name={icon}
          size={20}
          color={isSelected ? 'white' : '#20B2AA'}
      />
      </View>
      <Text
        style={[
          styles.label,
          isSelected && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
  },
  selectedButton: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedLabel: {
    color: 'white',
  },
});