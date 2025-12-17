import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
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
import { BottomNavigation, MetricCard, TaskCard } from '@/components';
import { getAppointments, getMetrics, getMyProfessionals, getTasks, getGoals } from '@/services/api';
import { APP_NAME } from '@/constants/theme';

// Define types for our data
interface Task {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
}

interface Metric {
  id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
}

interface Appointment {
  id: string;
  scheduled_at: string;
  mode: string;
  professional_id: number;
}

interface Professional {
  id: number;
  full_name: string;
}

interface Goal {
  id: string;
  title: string;
  progress: number;
  status: string;
}

const metricDisplayConfig: { [key: string]: { icon: any; label: string; color: string } } = {
  steps: { icon: 'walk', label: 'Steps Today', color: '#20B2AA' },
  calories: { icon: 'flame', label: 'Calories Burnt', color: '#90EE90' },
  sleep: { icon: 'moon', label: 'Sleep Last Night', color: '#20B2AA' },
  hydration: { icon: 'water', label: 'Hydration', color: '#90EE90' },
};

export default function ClientDashboardScreenRoute() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, tasksData, appointmentsData, professionalsData, goalsData] = await Promise.all([
          getMetrics(),
          getTasks(),
          getAppointments(),
          getMyProfessionals(),
          getGoals(),
        ]);
        setMetrics(metricsData);
        setTasks(tasksData);
        setAppointments(appointmentsData);
        setProfessionals(professionalsData);
        setGoals(goalsData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTaskToggle = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, is_completed: !task.is_completed }
        : task
    ));
    // Here you would also make an API call to update the task status
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  const nextAppointment = appointments
    .filter(a => new Date(a.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const nextAppointmentProfessional = nextAppointment
    ? professionals.find(p => p.id === nextAppointment.professional_id)
    : null;

  const displayedMetrics = Object.keys(metricDisplayConfig).map(type => {
    const latestMetric = metrics
      .filter(m => m.type === type)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
    return {
      type,
      value: latestMetric ? `${latestMetric.value}${latestMetric.unit}` : '0',
      ...metricDisplayConfig[type],
    };
  });

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
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? 'white' : '#333',
      marginBottom: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    appointmentCard: {
      backgroundColor: colorScheme === 'dark' ? '#222' : '#E0F7FA',
      borderRadius: 12,
      padding: 20,
    },
    appointmentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    appointmentTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colorScheme === 'dark' ? 'white' : '#333',
      marginLeft: 12,
    },
    appointmentDetails: {
      marginBottom: 16,
    },
    appointmentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    appointmentLabel: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#888' : '#666',
      fontWeight: '500',
    },
    appointmentValue: {
      fontSize: 14,
      color: colorScheme === 'dark' ? 'white' : '#333',
      fontWeight: '600',
    },
    viewDetailsButton: {
      backgroundColor: '#90EE90',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      alignSelf: 'center',
    },
    viewDetailsButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    messageButton: {
      backgroundColor: '#20B2AA',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    messageButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    goalProgressCard: {
      backgroundColor: colorScheme === 'dark' ? '#222' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: colorScheme === 'dark' ? '#333' : '#E0E0E0',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: '#20B2AA',
      borderRadius: 4,
    },
    trendCard: {
      backgroundColor: colorScheme === 'dark' ? '#222' : 'white',
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    careTeamCard: {
      backgroundColor: colorScheme === 'dark' ? '#222' : 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    careTeamLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    careTeamAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#20B2AA',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    careTeamInfo: {
      flex: 1,
    },
    careTeamName: {
      fontSize: 16,
      fontWeight: '600',
      color: colorScheme === 'dark' ? 'white' : '#333',
      marginBottom: 4,
    },
    careTeamRole: {
      fontSize: 14,
      color: '#666',
    },
    careTeamChatButton: {
      backgroundColor: '#20B2AA',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    careTeamChatButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    careTeamMessageButton: {
      padding: 8,
      backgroundColor: '#E0F7FA',
      borderRadius: 8,
    },
    emptyStateCard: {
      backgroundColor: colorScheme === 'dark' ? '#222' : 'white',
      borderRadius: 12,
      padding: 32,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    emptyStateText: {
      fontSize: 16,
      color: '#666',
      marginTop: 16,
      marginBottom: 20,
      textAlign: 'center',
    },
    inviteButton: {
      backgroundColor: '#20B2AA',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inviteButtonText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colorScheme === 'dark' ? '#121212' : 'white'} />

      <View style={styles.header}>
        <View style={styles.headerLeft}></View>
        <View style={styles.headerCenter}><Text style={styles.appTitle}>{APP_NAME}</Text></View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleNotificationPress}><Ionicons name="notifications" size={24} color="#20B2AA" /></TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}><View style={styles.profileImage}><Ionicons name="person" size={20} color="white" /></View></TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.metricsGrid}>
            {displayedMetrics.map(metric => (
              <MetricCard
                key={metric.type}
                icon={metric.icon}
                value={metric.value}
                label={metric.label}
                color={metric.color}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              description={task.description}
              isCompleted={task.is_completed}
              status={"Upcoming"} // Or derive from due date
              onToggle={() => handleTaskToggle(task.id)}
            />
          ))}
        </View>

        {/* Goals Progress Section */}
        {goals.length > 0 && (
          <View style={styles.section}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={styles.sectionTitle}>My Goals Progress</Text>
              <TouchableOpacity onPress={() => router.push('/goals')}>
                <Text style={{color: '#20B2AA', fontSize: 14, fontWeight: '600'}}>View All</Text>
              </TouchableOpacity>
            </View>
            {goals.slice(0, 3).map((goal) => (
              <View key={goal.id} style={styles.goalProgressCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={{fontSize: 16, fontWeight: '600', color: colorScheme === 'dark' ? 'white' : '#333', flex: 1}}>
                    {goal.title}
                  </Text>
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#20B2AA'}}>
                    {Math.round(goal.progress)}%
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${goal.progress}%` }]} />
                </View>
                <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                  Status: {goal.status}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Health Trends Summary */}
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={styles.sectionTitle}>Health Trends</Text>
            <TouchableOpacity onPress={() => router.push('/analytics')}>
              <Text style={{color: '#20B2AA', fontSize: 14, fontWeight: '600'}}>View Analytics</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.trendCard}>
            <View style={styles.trendRow}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={{fontSize: 14, color: colorScheme === 'dark' ? 'white' : '#333', marginLeft: 8}}>
                Activity increasing this week
              </Text>
            </View>
            <View style={styles.trendRow}>
              <Ionicons name="heart" size={20} color="#20B2AA" />
              <Text style={{fontSize: 14, color: colorScheme === 'dark' ? 'white' : '#333', marginLeft: 8}}>
                {metrics.length} health metrics tracked
              </Text>
            </View>
            <View style={styles.trendRow}>
              <Ionicons name="checkmark-circle" size={20} color="#90EE90" />
              <Text style={{fontSize: 14, color: colorScheme === 'dark' ? 'white' : '#333', marginLeft: 8}}>
                {tasks.filter(t => t.is_completed).length} of {tasks.length} tasks completed
              </Text>
            </View>
          </View>
        </View>

        {/* My Care Team Section */}
        <View style={styles.section}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <Text style={styles.sectionTitle}>My Care Team</Text>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={{color: '#20B2AA', fontSize: 14, fontWeight: '600'}}>Invite</Text>
            </TouchableOpacity>
          </View>
          
          {/* Care Team Chat Button */}
          {professionals.length > 0 && (
            <TouchableOpacity 
              style={styles.careTeamChatButton}
              onPress={async () => {
                try {
                  const { getCareTeamConversation } = await import('@/services/api');
                  const conversation = await getCareTeamConversation();
                  router.push({ pathname: '/chat', params: { conversationId: conversation.id } });
                } catch (err: any) {
                  console.error('Failed to open care team chat', err);
                  if (err?.message?.includes('No care team members')) {
                    alert('Connect with professionals first to start the care team chat');
                  } else {
                    alert('Failed to open care team chat');
                  }
                }
              }}
            >
              <Ionicons name="chatbubbles" size={20} color="white" />
              <Text style={styles.careTeamChatButtonText}>Chat with Care Team</Text>
            </TouchableOpacity>
          )}
          
          {professionals.length > 0 ? (
            professionals.map((prof) => (
              <View key={prof.id} style={styles.careTeamCard}>
                <View style={styles.careTeamLeft}>
                  <View style={styles.careTeamAvatar}>
                    <Ionicons name="person" size={24} color="white" />
                  </View>
                  <View style={styles.careTeamInfo}>
                    <Text style={styles.careTeamName}>{prof.full_name}</Text>
                    <Text style={styles.careTeamRole}>Healthcare Professional</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.careTeamMessageButton}
                  onPress={async () => {
                    try {
                      const { getCareTeamConversation } = await import('@/services/api');
                      const conversation = await getCareTeamConversation();
                      router.push({ pathname: '/chat', params: { conversationId: conversation.id } });
                    } catch (err: any) {
                      console.error('Failed to open care team chat', err);
                      if (err?.message?.includes('No care team members')) {
                        alert('Connect with professionals first to start the care team chat');
                      } else {
                        alert('Failed to open care team chat');
                      }
                    }
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#20B2AA" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="people-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>No professionals connected yet</Text>
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="link-outline" size={20} color="white" />
                <Text style={styles.inviteButtonText}>Use Invite Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Appointment</Text>
          {nextAppointment ? (
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Ionicons name="calendar" size={24} color="#20B2AA" />
                <Text style={styles.appointmentTitle}>Telehealth Check-up</Text>
              </View>
              <View style={styles.appointmentDetails}>
                <View style={styles.appointmentRow}>
                  <Text style={styles.appointmentLabel}>Date:</Text>
                  <Text style={styles.appointmentValue}>{new Date(nextAppointment.scheduled_at).toLocaleDateString()}</Text>
                </View>
                <View style={styles.appointmentRow}>
                  <Text style={styles.appointmentLabel}>Time:</Text>
                  <Text style={styles.appointmentValue}>{new Date(nextAppointment.scheduled_at).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.appointmentRow}>
                  <Text style={styles.appointmentLabel}>Professional:</Text>
                  <Text style={styles.appointmentValue}>{nextAppointmentProfessional?.full_name || 'N/A'}</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => router.push({ pathname: '/appointment-detail', params: { id: nextAppointment.id.toString() } })}
              >
                <Text style={styles.viewDetailsButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text>No upcoming appointments.</Text>
          )}
        </View>
      </ScrollView>

      <BottomNavigation
        activeTab="home"
        onTabPress={(tabId: string) => { }}
        tabs={bottomTabs}
        role="client"
      />
    </SafeAreaView>
  );
};
