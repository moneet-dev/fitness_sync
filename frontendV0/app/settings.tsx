import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BottomNavigation, Header, Toggle } from '@/components';
import { updateUserProfile } from '@/services/api';
import { clearAuthToken } from '@/services/auth';
import { useUser } from '@/context/UserContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, loading, refreshUser, isClient } = useUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    // Load dark mode preference
    const loadDarkMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('darkMode');
        if (savedMode !== null) {
          setDarkModeEnabled(savedMode === 'true');
        }
      } catch (error) {
        console.error('Failed to load dark mode preference:', error);
      }
    };
    loadDarkMode();
  }, []);

  const handleDarkModeToggle = async (value: boolean) => {
    try {
      setDarkModeEnabled(value);
      await AsyncStorage.setItem('darkMode', value.toString());
      Alert.alert(
        'Dark Mode',
        value ? 'Dark mode enabled! (Feature coming soon)' : 'Dark mode disabled'
      );
    } catch (error) {
      console.error('Failed to save dark mode preference:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAuthToken();
              router.replace('/welcome');
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    if (!user) return;
    setEditedName(user.full_name);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editedName || editedName.trim() === '') {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    try {
      await updateUserProfile({ full_name: editedName.trim() });
      await refreshUser();
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleConnectedDevices = () => {
    // TODO: Implement connected devices logic
    console.log('Connected devices pressed');
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  const bottomTabs = [
    { id: 'home', label: 'Home', icon: 'home' as const },
    { id: 'chat', label: 'Chat', icon: 'chatbubble' as const },
    { id: 'goals', label: 'Goals', icon: 'flag' as const },
    { id: 'analytics', label: 'Analytics', icon: 'stats-chart' as const },
    { id: 'profile', label: 'Profile', icon: 'person' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <Header
        title="Settings & Profile Management"
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
        showProfile
        onProfilePress={handleProfilePress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#20B2AA" />
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={32} color="white" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.full_name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Ionicons name="pencil" size={20} color="#20B2AA" />
            </TouchableOpacity>
          </View>
        )}

        {/* App Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.preferencesContainer}>
            <Toggle
              label="Enable Notifications"
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
            />
            <Toggle
              label="Dark Mode"
              value={darkModeEnabled}
              onValueChange={handleDarkModeToggle}
            />
          </View>
        </View>

        {/* Connections Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connections</Text>
          <TouchableOpacity style={styles.connectionItem} onPress={handleConnectedDevices}>
            <View style={styles.connectionLeft}>
              <View style={styles.connectionIcon}>
                <Ionicons name="phone-portrait" size={20} color="#20B2AA" />
              </View>
              <View style={styles.connectionInfo}>
                <Text style={styles.connectionTitle}>Connected Devices</Text>
                <Text style={styles.connectionSubtitle}>3 devices connected</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="profile"
        onTabPress={(tabId: string) => {}}
        tabs={bottomTabs}
        role={isClient ? 'client' : 'professional'}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.modalLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Enter your name"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  preferencesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  connectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  connectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSave: {
    backgroundColor: '#20B2AA',
  },
  modalButtonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
