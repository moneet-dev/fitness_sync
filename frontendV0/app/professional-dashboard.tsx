import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { BottomNavigation, ClientCard, MetricCard } from '@/components';
import { getClients, createConversation, getProfessionalStats, getAppointments } from '@/services/api';
import { APP_NAME } from '@/constants/theme';

interface Client {
  id: string;
  full_name: string;
}

interface ProfessionalStats {
  total_clients: number;
  appointments_this_week: number;
  upcoming_appointments: number;
  total_notes: number;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  client_id: number;
  mode: string;
}

export default function ProfessionalDashboardScreenRoute() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsData, statsData, appointmentsData] = await Promise.all([
          getClients(false), // Get assigned clients only
          getProfessionalStats(),
          getAppointments(),
        ]);
        setClients(clientsData);
        setStats(statsData);
        
        // Filter for upcoming appointments (next 7 days)
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcoming = appointmentsData.filter((appt: Appointment) => {
          const apptDate = new Date(appt.scheduled_at);
          return apptDate >= now && apptDate <= nextWeek;
        });
        setUpcomingAppointments(upcoming.slice(0, 3)); // Show only next 3
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleHomePress = () => {
    router.push('/professional-dashboard');
  };

  const handleAssignClients = () => {
    router.push('/client-assignment');
  };

  const handleProfilePress = () => {
    router.push('/professional-profile');
  };

  const handleViewProfile = (clientId: string, clientName: string) => {
    router.push({
      pathname: '/client-detail',
      params: { clientId, clientName },
    });
  };

  const handleAddNote = (clientName: string) => {
    // TODO: Implement add note logic
    console.log('Add note for:', clientName);
  };

  const handleScheduleSession = (clientName: string) => {
    // TODO: Implement schedule session logic
    console.log('Schedule session for:', clientName);
  };

  const handleMessageClient = async (clientId: string, clientName: string) => {
    try {
      const conversation = await createConversation(Number(clientId));
      router.push({ pathname: '/chat', params: { conversationId: conversation.id.toString() } });
    } catch (error) {
      console.error('Failed to start conversation with', clientName, error);
    }
  };

  const bottomTabs = [
    { id: 'home', label: 'Home', icon: 'home' as const },
    { id: 'chat', label: 'Chat', icon: 'chatbubble' as const },
    { id: 'goals', label: 'Goals', icon: 'flag' as const },
    { id: 'analytics', label: 'Analytics', icon: 'stats-chart' as const },
    { id: 'profile', label: 'Profile', icon: 'person' as const },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#121212' : 'white',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colorScheme === 'dark' ? '#333' : '#F0F0F0',
    },
    headerLeft: {
      flex: 1,
      alignItems: 'flex-start',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    time: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? 'white' : '#333',
    },
    appTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? 'white' : '#333',
    },
    headerButton: {
      padding: 8,
      marginRight: 12,
    },
    profileButton: {
      padding: 4,
    },
    profileImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#20B2AA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 20,
    },
    clientList: {
      paddingVertical: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statsSection: {
      marginTop: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colorScheme === 'dark' ? 'white' : '#333',
      marginBottom: 12,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    appointmentsSection: {
      marginBottom: 20,
    },
    appointmentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'white',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    appointmentLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    appointmentInfo: {
      marginLeft: 12,
      flex: 1,
    },
    appointmentClient: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
      marginBottom: 4,
    },
    appointmentTime: {
      fontSize: 14,
      color: '#666',
      marginBottom: 2,
    },
    appointmentMode: {
      fontSize: 12,
      color: '#999',
      textTransform: 'capitalize',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text>Loading clients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colorScheme === 'dark' ? '#121212' : 'white'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.time}>9:41</Text>
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.appTitle}>{APP_NAME}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleHomePress}>
            <Ionicons name="home" size={24} color="#20B2AA" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              icon="people"
              value={stats?.total_clients.toString() || "0"}
              label="Total Clients"
              color="#20B2AA"
            />
            <MetricCard
              icon="calendar"
              value={stats?.appointments_this_week.toString() || "0"}
              label="This Week"
              color="#FF9800"
            />
            <MetricCard
              icon="time"
              value={stats?.upcoming_appointments.toString() || "0"}
              label="Upcoming"
              color="#2196F3"
            />
            <MetricCard
              icon="document-text"
              value={stats?.total_notes.toString() || "0"}
              label="Total Notes"
              color="#90EE90"
            />
          </View>
        </View>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <View style={styles.appointmentsSection}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {upcomingAppointments.map((appt) => {
              const client = clients.find(c => c.id === appt.client_id.toString());
              const apptDate = new Date(appt.scheduled_at);
              return (
                <TouchableOpacity 
                  key={appt.id} 
                  style={styles.appointmentCard}
                  onPress={() => router.push({ pathname: '/appointment-detail', params: { id: appt.id.toString() } })}
                >
                  <View style={styles.appointmentLeft}>
                    <Ionicons name="calendar-outline" size={24} color="#20B2AA" />
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentClient}>
                        {client?.full_name || 'Unknown Client'}
                      </Text>
                      <Text style={styles.appointmentTime}>
                        {apptDate.toLocaleDateString()} at {apptDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                      <Text style={styles.appointmentMode}>{appt.mode}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={{marginTop: 20, marginBottom: 16}}>
          <TouchableOpacity
            style={{
              backgroundColor: '#20B2AA',
              padding: 16,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleAssignClients}
          >
            <Ionicons name="person-add" size={24} color="white" />
            <Text style={{color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8}}>
              Assign New Clients
            </Text>
          </TouchableOpacity>
        </View>

        {/* Client List */}
        <View style={styles.clientList}>
          <Text style={{fontSize: 18, fontWeight: '600', marginBottom: 12, color: colorScheme === 'dark' ? 'white' : '#333'}}>
            Your Clients ({clients.length})
          </Text>
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              name={client.full_name}
              status={'Active'} // Placeholder
              lastActivity={'Last activity not tracked yet'} // Placeholder
              onViewProfile={() => handleViewProfile(client.id, client.full_name)}
              onAddNote={() => handleAddNote(client.full_name)}
              onScheduleSession={() => handleScheduleSession(client.full_name)}
              onMessage={() => handleMessageClient(client.id, client.full_name)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="home"
        onTabPress={(tabId: string) => {}}
        tabs={bottomTabs}
        role="professional"
      />
    </SafeAreaView>
  );
};
