import { BottomNavigation, Header, MetricCard } from '@/components';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUser } from '@/context/UserContext';
import { getMetrics, getProfessionalStats, getClients, getAppointments } from '@/services/api';

const { width } = Dimensions.get('window');

interface ProfessionalStats {
  total_clients: number;
  appointments_this_week: number;
  upcoming_appointments: number;
  total_notes: number;
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const { isClient, isProfessional, loading: userLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [professionalStats, setProfessionalStats] = useState<ProfessionalStats | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Wait for user context to load
      if (userLoading) return;
      
      // Don't fetch if user data isn't available
      if (!isClient && !isProfessional) {
        console.warn('[Analytics] User role not determined yet');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        if (isProfessional) {
          const stats = await getProfessionalStats();
          setProfessionalStats(stats);
        } else if (isClient) {
          const metricsData = await getMetrics();
          setMetrics(metricsData);
        }
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isProfessional, isClient, userLoading]);
  
  const handleBackPress = () => {
    router.back();
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

  const renderProgressBar = (current: number, target: number, label: string, deadline: string) => {
    const percentage = Math.min((current / target) * 100, 100);
    
    return (
      <View style={styles.goalItem}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalText}>{label}</Text>
          <Text style={styles.goalDeadline}>{deadline}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
        </View>
        <Text style={styles.goalStats}>
          {current} / {target}
        </Text>
      </View>
    );
  };

  const renderClientAnalytics = () => (
    <>
      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="heart"
            value="7"
            label="Workouts This Week"
            color="#20B2AA"
          />
          <MetricCard
            icon="moon"
            value="8.2 hrs"
            label="Avg. Sleep"
            color="#90EE90"
          />
          <MetricCard
            icon="flame"
            value="2100 kcal"
            label="Avg. Calories"
            color="#FF9800"
          />
          <MetricCard
            icon="water"
            value="2.5 L"
            label="Avg. Hydration"
            color="#2196F3"
          />
        </View>
      </View>

      {/* Weight Trend Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trend Over Time</Text>
        <Text style={styles.chartSubtitle}>Weight Trend</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Weight Trend Chart</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Jan - Jun 2024{'\n'}
              Weight (kg) vs Goal Weight (kg)
            </Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#20B2AA' }]} />
              <Text style={styles.legendText}>Weight (kg)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#90EE90' }]} />
              <Text style={styles.legendText}>Goal Weight (kg)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Daily Calorie Burn Chart */}
      <View style={styles.section}>
        <Text style={styles.chartSubtitle}>Daily Calorie Burn</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Daily Calorie Burn Chart</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Mon - Sun{'\n'}
              Calories Burned per Day
            </Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#90EE90' }]} />
              <Text style={styles.legendText}>Calories Burned</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Monthly Activity Progress Chart */}
      <View style={styles.section}>
        <Text style={styles.chartSubtitle}>Monthly Activity Progress</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Monthly Activity Chart</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Jan - Jun 2024{'\n'}
              Steps vs Goal
            </Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#20B2AA' }]} />
              <Text style={styles.legendText}>Steps</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#90EE90' }]} />
              <Text style={styles.legendText}>Goal</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Current Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Goals</Text>
        {renderProgressBar(69, 70, 'Achieve target weight of 70kg', '2024-07-30')}
        {renderProgressBar(7500, 8000, 'Complete 8000 steps daily average', '2024-08-15')}
      </View>
    </>
  );

  const renderProfessionalAnalytics = () => (
    <>
      {/* Practice Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practice Overview</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="people"
            value={professionalStats?.total_clients.toString() || "0"}
            label="Total Clients"
            color="#20B2AA"
          />
          <MetricCard
            icon="calendar"
            value={professionalStats?.appointments_this_week.toString() || "0"}
            label="Appointments This Week"
            color="#FF9800"
          />
          <MetricCard
            icon="time"
            value={professionalStats?.upcoming_appointments.toString() || "0"}
            label="Upcoming Appointments"
            color="#2196F3"
          />
          <MetricCard
            icon="document-text"
            value={professionalStats?.total_notes.toString() || "0"}
            label="Total Notes"
            color="#90EE90"
          />
        </View>
      </View>

      {/* Client Engagement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Engagement</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Client Activity Chart</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Active clients over time{'\n'}
              Track engagement patterns
            </Text>
          </View>
        </View>
      </View>

      {/* Appointment Trends */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Trends</Text>
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Appointment Distribution</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              Weekly appointment patterns{'\n'}
              By type and client
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/professional-dashboard')}
        >
          <Text style={styles.actionButtonText}>View My Invite Code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
          onPress={() => router.push({
            pathname: '/professional-profile',
            params: { initialTab: 'Clients' }
          })}
        >
          <Text style={styles.actionButtonText}>View All Clients</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  if (loading || userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <Header
        title="Analytics"
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
        showProfile
        onProfilePress={handleProfilePress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isClient ? renderClientAnalytics() : renderProfessionalAnalytics()}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with</Text>
          <View style={styles.vLogo}>
            <Text style={styles.vLogoText}>V</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="analytics"
        onTabPress={(tabId: string) => {}}
        tabs={bottomTabs}
        role={isClient ? "client" : "professional"}
      />
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chartSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartContainer: {
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
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  chartPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  goalItem: {
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
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  goalDeadline: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
    minWidth: 40,
  },
  goalStats: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#333',
  },
  vLogo: {
    width: 20,
    height: 20,
    backgroundColor: '#8A2BE2',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  vLogoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    backgroundColor: '#20B2AA',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
