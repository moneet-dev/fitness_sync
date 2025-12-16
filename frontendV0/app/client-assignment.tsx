import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomNavigation, Header } from '@/components';
import { getClients, createAssignment } from '@/services/api';
import { useUser } from '@/context/UserContext';

export default function ClientAssignmentScreen() {
  const router = useRouter();
  const { user, isProfessional, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(true);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [assignedClients, setAssignedClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState<number | null>(null);

  useEffect(() => {
    // Wait for UserContext to load before checking role
    if (userLoading) return;
    
    if (!isProfessional) {
      Alert.alert('Error', 'Only professionals can access this screen');
      router.back();
      return;
    }
    loadClients();
  }, [isProfessional, userLoading]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const [all, assigned] = await Promise.all([
        getClients(true), // all clients
        getClients(false), // assigned clients
      ]);
      setAllClients(all || []);
      setAssignedClients(assigned || []);
    } catch (err) {
      console.error('Failed to load clients', err);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClient = async (clientId: number) => {
    if (!user) return;
    setAssigning(clientId);
    try {
      await createAssignment(clientId, user.id);
      Alert.alert('Success', 'Client assigned successfully');
      // Reload to update lists
      await loadClients();
    } catch (err: any) {
      console.error('Failed to assign client', err);
      Alert.alert('Error', err?.message || 'Failed to assign client');
    } finally {
      setAssigning(null);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // Filter clients by search query
  const assignedClientIds = new Set(assignedClients.map((c) => c.id));
  const unassignedClients = allClients.filter((c) => !assignedClientIds.has(c.id));

  const filteredClients = searchQuery.trim()
    ? unassignedClients.filter((client) =>
        client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : unassignedClients;

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

      <Header
        title="Assign Clients"
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search unassigned clients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {userLoading || loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{assignedClients.length}</Text>
              <Text style={styles.statLabel}>Your Clients</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{unassignedClients.length}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>

          {/* Unassigned Clients List */}
          <Text style={styles.sectionTitle}>Available Clients</Text>

          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientAvatar}>
                  <Ionicons name="person" size={32} color="white" />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.full_name || 'No Name'}</Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                  <Text style={styles.clientJoined}>
                    Joined {new Date(client.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.assignButton, assigning === client.id && styles.assigningButton]}
                  onPress={() => handleAssignClient(client.id)}
                  disabled={assigning === client.id}
                >
                  {assigning === client.id ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={20} color="white" />
                      <Text style={styles.assignButtonText}>Assign</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          ) : searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No clients found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>All clients assigned!</Text>
              <Text style={styles.emptySubtext}>You've assigned all available clients</Text>
            </View>
          )}
        </ScrollView>
      )}

      <BottomNavigation
        activeTab="home"
        onTabPress={(tabId: string) => {
          if (tabId === 'home') router.push('/professional-dashboard');
          else if (tabId === 'chat') router.push('/conversations' as any);
          else if (tabId === 'goals') router.push('/goals');
          else if (tabId === 'analytics') router.push('/analytics');
          else if (tabId === 'profile') router.push('/professional-profile');
        }}
        tabs={bottomTabs}
        role="professional"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#20B2AA',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clientEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  clientJoined: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  assigningButton: {
    opacity: 0.5,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
