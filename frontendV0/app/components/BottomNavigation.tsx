import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ModeButton } from './ModeButton';

interface TabItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tabId: string) => void;
  tabs: TabItem[];
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
  tabs,
}) => {
  const { colorScheme } = useColorScheme();
  const router = useRouter();

  const navigateForTab = (tabId: string) => {
    // Map tab ids to routes in the app
    switch (tabId) {
      case 'home':
        router.push('/client-dashboard');
        break;
      case 'chat':
        router.push('/chat');
        break;
      case 'goals':
        router.push('/goals');
        break;
      case 'analytics':
        router.push('/analytics');
        break;
      case 'profile':
        router.push('/client-profile');
        break;
      default:
        // fallback to root
        router.push('/');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colorScheme === 'dark' ? '#121212' : 'white',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderTopWidth: 1,
      borderTopColor: colorScheme === 'dark' ? '#333' : '#E0E0E0',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 8,
      alignItems: 'center',
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    iconContainer: {
      position: 'relative',
      marginBottom: 4,
    },
    badge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: '#FF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: 'bold',
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => {
            try {
              console.log('BottomNavigation: tab pressed', tab.id);
            } catch {}
            if (onTabPress) onTabPress(tab.id);
            navigateForTab(tab.id);
          }}
        >
          <View style={styles.iconContainer}>
            <Ionicons
              name={tab.icon}
              size={24}
              color={activeTab === tab.id ? '#20B2AA' : colorScheme === 'dark' ? '#888' : '#999'}
            />
            {tab.badge && tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === tab.id ? '#20B2AA' : colorScheme === 'dark' ? '#888' : '#999' },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
      <ModeButton />
    </View>
  );
};
