import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface UserTypeCardProps {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const UserTypeCard: React.FC<UserTypeCardProps> = ({
  title,
  iconName,
  isSelected,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected ? styles.selectedCard : styles.unselectedCard,
        style,
      ]}
      onPress={onPress}
    >
      <Ionicons
        name={iconName}
        size={32}
        color={isSelected ? '#20B2AA' : '#999'}
      />
      <Text
        style={[
          styles.cardText,
          isSelected ? styles.selectedText : styles.unselectedText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 12,
  },
  selectedCard: {
    backgroundColor: '#E0F7FA',
    borderWidth: 2,
    borderColor: '#20B2AA',
  },
  unselectedCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedText: {
    color: '#20B2AA',
  },
  unselectedText: {
    color: '#999',
  },
});
