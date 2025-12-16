import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  style?: any;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  value,
  onValueChange,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#20B2AA' }}
        thumbColor={value ? 'white' : '#f4f3f4'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
