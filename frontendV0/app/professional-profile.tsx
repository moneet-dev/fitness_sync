import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BottomNavigation, Header, TabNavigation } from '@/components';
import { useUser } from '@/context/UserContext';
import { getMetrics, getClients } from '@/services/api';

interface Client {
  id: number;
  full_name: string;
  email: string;
}

interface Metric {
  id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
}

export default function ProfessionalProfileScreenRoute() {
  const router = useRouter();
  const { initialTab } = useLocalSearchParams();
  const { user, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState((initialTab as string) || 'Overview');
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, metricsData] = await Promise.all([
          getClients(),
          getMetrics(),
        ]);
        setClients(clientsData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading && user) {
      fetchData();
    }
  }, [userLoading, user]);

  const handleBackPress = () => {
    router.back();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  const handleTabPress = (tabId: string) => {
    setActiveTab(tabId);
  };

  const tabs = [
    { id: 'Overview', label: 'Overview' },
    { id: 'Credentials', label: 'Credentials' },
    { id: 'Availability', label: 'Availability' },
    { id: 'Clients', label: 'Clients' },
  ];

  const bottomTabs = [
    { id: 'home', label: 'Home', icon: 'home' as const },
    { id: 'chat', label: 'Chat', icon: 'chatbubble' as const },
    { id: 'goals', label: 'Goals', icon: 'flag' as const },
    { id: 'analytics', label: 'Analytics', icon: 'stats-chart' as const },
    { id: 'profile', label: 'Profile', icon: 'person' as const },
  ];

  const getRoleDisplayName = () => {
    if (!user?.role) return 'Professional';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  };

  const renderOverviewContent = () => (
    <View>
      {/* Profile Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Summary</Text>
        
        <View style={styles.profileSummaryCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={48} color="white" />
            </View>
            <View style={styles.profileHeaderInfo}>
              <Text style={styles.profileName}>{user?.full_name || 'Professional'}</Text>
              <Text style={styles.profileRole}>{getRoleDisplayName()}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{clients.length}</Text>
              <Text style={styles.statLabel}>Active Clients</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>-</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutText}>
            Professional healthcare provider committed to helping clients achieve their health and wellness goals.
          </Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={16} color="#20B2AA" />
            <Text style={styles.editButtonText}>Edit Bio</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Ionicons name="calendar" size={24} color="#20B2AA" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Manage Availability</Text>
            <Text style={styles.actionSubtitle}>Set your working hours</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIcon}>
            <Ionicons name="document-text" size={24} color="#20B2AA" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Update Credentials</Text>
            <Text style={styles.actionSubtitle}>Add certifications & licenses</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderClientsTab = () => (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Clients ({clients.length})</Text>
        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#CCC" />
            <Text style={styles.emptyStateText}>No clients assigned yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Use "Assign New Clients" to add clients to your roster
            </Text>
          </View>
        ) : (
          <View>
            {clients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.clientCard}
                onPress={() => router.push({
                  pathname: '/client-detail',
                  params: { clientId: client.id.toString(), clientName: client.full_name }
                })}
              >
                <View style={styles.clientAvatar}>
                  <Ionicons name="person" size={24} color="#20B2AA" />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.full_name}</Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderOtherTabs = () => (
    <View style={styles.placeholderContainer}>
      <Ionicons name="construct" size={48} color="#CCC" />
      <Text style={styles.placeholderText}>
        {activeTab} content coming soon
      </Text>
      <Text style={styles.placeholderSubtext}>
        This feature is under development
      </Text>
    </View>
  );

  if (userLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Header
          title="Professional Profile"
          showBackButton
          onBackPress={handleBackPress}
          rightIcon="notifications"
          onRightIconPress={handleNotificationPress}
          showProfile
          onProfilePress={handleProfilePress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <Header
        title="Professional Profile"
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
        showProfile
        onProfilePress={handleProfilePress}
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
        tabs={tabs}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'Overview' && renderOverviewContent()}
        {activeTab === 'Clients' && renderClientsTab()}
        {(activeTab === 'Credentials' || activeTab === 'Availability') && renderOtherTabs()}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="profile"
        onTabPress={(tabId: string) => {}}
        tabs={bottomTabs}
        role="professional"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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
  profileSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileHeaderInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#20B2AA',
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  aboutCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  editButtonText: {
    fontSize: 14,
    color: '#20B2AA',
    fontWeight: '600',
    marginLeft: 6,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#666',
  },
});
