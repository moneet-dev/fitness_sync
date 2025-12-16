import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
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
import { BottomNavigation, Header, ProfessionalCard, TabNavigation } from '@/components';
import { getCurrentUser, getMetrics, getMyProfessionals, createConversation, getPlans, deletePlan } from '@/services/api';
import { useUser } from '@/context/UserContext';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface Metric {
  id: string;
  type: string;
  value: number;
  unit: string;
  recorded_at: string;
}

interface Plan {
  id: number;
  plan_type: string;
  title: string;
  description: string | null;
  content: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  professional_name: string;
  created_at: string;
}

export default function ClientProfileScreenRoute() {
  const router = useRouter();
  const { loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState('Vitals');
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (userLoading) return;
      
      try {
        const [userData, metricsData, professionalsData] = await Promise.all([
          getCurrentUser(),
          getMetrics(),
          getMyProfessionals(),
        ]);
        setUser(userData);
        setMetrics(metricsData);
        setProfessionals(professionalsData);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading) {
      fetchData();
      fetchPlans();
    }
  }, [userLoading]);

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const allPlans = await getPlans();
      setPlans(allPlans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleDeletePlan = async (planId: number, planTitle: string) => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${planTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(planId);
              Alert.alert('Success', 'Plan deleted successfully');
              fetchPlans();
            } catch (error) {
              console.error('Failed to delete plan:', error);
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

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

  const handleChatWithProfessional = async (professionalId: number, professionalName: string) => {
    try {
      const conversation = await createConversation(professionalId);
      router.push({ pathname: '/chat', params: { conversationId: conversation.id.toString() } });
    } catch (error) {
      console.error('Failed to start conversation with', professionalName, error);
      // Could add Alert here if needed
    }
  };

  const tabs = [
    { id: 'Vitals', label: 'Vitals' },
    { id: 'Diet Plan', label: 'Diet Plan' },
    { id: 'Workout Plan', label: 'Workout Plan' },
    { id: 'Doctors', label: 'Doctors' },
  ];

  const bottomTabs = [
    { id: 'home', label: 'Home', icon: 'home' as const },
    { id: 'chat', label: 'Chat', icon: 'chatbubble' as const },
    { id: 'goals', label: 'Goals', icon: 'flag' as const },
    { id: 'analytics', label: 'Analytics', icon: 'stats-chart' as const },
    { id: 'profile', label: 'Profile', icon: 'person' as const },
  ];

  // Calculate BMI from metrics or show placeholder
  const calculateBMI = () => {
    const weight = metrics.find(m => m.type === 'weight')?.value;
    const height = metrics.find(m => m.type === 'height')?.value;
    
    if (weight && height) {
      // Assuming weight is in kg and height is in cm, convert to meters
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    
    // Check if BMI is directly stored as a metric
    const bmiMetric = metrics.find(m => m.type === 'bmi')?.value;
    return bmiMetric ? bmiMetric.toFixed(1) : null;
  };

  const renderVitalsContent = () => {
    const bmiValue = calculateBMI();
    
    return (
      <View>
        {/* Health Overview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          
          {/* BMI Card */}
          <View style={styles.bmiCard}>
            <View style={styles.bmiHeader}>
              <View style={styles.bmiIcon}>
                <Ionicons name="scale" size={24} color="white" />
              </View>
              <Text style={styles.bmiLabel}>Body Mass Index (BMI)</Text>
            </View>
            <View style={styles.bmiValue}>
              {loading ? (
                <ActivityIndicator size="small" color="#20B2AA" />
              ) : bmiValue ? (
                <>
                  <Text style={styles.bmiNumber}>{bmiValue}</Text>
                  <Text style={styles.bmiUnit}>kg/m²</Text>
                </>
              ) : (
                <Text style={styles.bmiPlaceholder}>No data</Text>
              )}
            </View>
          </View>

        {/* Weight Trends Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Trends</Text>
          <Text style={styles.chartSubtitle}>Last 6 Months</Text>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>Weight Trend Chart</Text>
            <Text style={styles.chartPlaceholderSubtext}>
              {(() => {
                const now = new Date();
                const sixMonthsAgo = new Date(now);
                sixMonthsAgo.setMonth(now.getMonth() - 6);
                const startMonth = sixMonthsAgo.toLocaleDateString('en-US', { month: 'short' });
                const endMonth = now.toLocaleDateString('en-US', { month: 'short' });
                const year = now.getFullYear();
                return `${startMonth} - ${endMonth} ${year}`;
              })()}{'\n'}
              Current Weight vs Ideal Weight
            </Text>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#20B2AA' }]} />
              <Text style={styles.legendText}>Current Weight</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#90EE90' }]} />
              <Text style={styles.legendText}>Ideal Weight</Text>
            </View>
          </View>
        </View>
      </View>

        {/* Assigned Professionals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assigned Professionals</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#20B2AA" />
            <Text style={styles.loadingText}>Loading professionals...</Text>
          </View>
        ) : professionals.length > 0 ? (
          professionals.map((professional) => (
            <ProfessionalCard
              key={professional.id}
              name={professional.full_name}
              specialty={professional.role.charAt(0).toUpperCase() + professional.role.slice(1)}
              isOnline={false}
              onChat={() => handleChatWithProfessional(professional.id, professional.full_name)}
            />
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>No professionals assigned yet</Text>
            <Text style={styles.emptyStateSubtext}>Contact your administrator to get assigned to a professional</Text>
          </View>
        )}
        </View>
      </View>
    );
  };

  const renderDietPlanTab = () => {
    const dietPlans = plans.filter((p) => p.plan_type === 'diet');

    return (
      <View style={styles.plansContainer}>
        <View style={styles.planHeader}>
          <Text style={styles.sectionTitle}>Diet Plans</Text>
        </View>

        {plansLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#20B2AA" />
            <Text style={styles.loadingText}>Loading diet plans...</Text>
          </View>
        ) : dietPlans.length > 0 ? (
          dietPlans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planCardHeader}>
                <View style={styles.planIconContainer}>
                  <Ionicons name="restaurant" size={24} color="#20B2AA" />
                </View>
                <View style={styles.planCardInfo}>
                  <Text style={styles.planCardTitle}>{plan.title}</Text>
                  <Text style={styles.planCardSubtitle}>
                    By {plan.professional_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, plan.status === 'active' && styles.statusBadgeActive]}>
                  <Text style={[styles.statusText, plan.status === 'active' && styles.statusTextActive]}>
                    {plan.status}
                  </Text>
                </View>
              </View>

              {plan.description && (
                <Text style={styles.planDescription}>{plan.description}</Text>
              )}

              {plan.content && (
                <View style={styles.planContent}>
                  <Text style={styles.planContentLabel}>Plan Details:</Text>
                  <Text style={styles.planContentText}>
                    {typeof plan.content === 'string' ? plan.content : JSON.stringify(plan.content, null, 2)}
                  </Text>
                </View>
              )}

              {(plan.start_date || plan.end_date) && (
                <View style={styles.planDates}>
                  {plan.start_date && (
                    <Text style={styles.planDateText}>
                      Start: {new Date(plan.start_date).toLocaleDateString()}
                    </Text>
                  )}
                  {plan.end_date && (
                    <Text style={styles.planDateText}>
                      End: {new Date(plan.end_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.planActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePlan(plan.id, plan.title)}
                >
                  <Ionicons name="trash" size={18} color="#FF6B6B" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="restaurant-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No diet plans yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your professional will create a personalized diet plan for you
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderWorkoutPlanTab = () => {
    const workoutPlans = plans.filter((p) => p.plan_type === 'workout');

    return (
      <View style={styles.plansContainer}>
        <View style={styles.planHeader}>
          <Text style={styles.sectionTitle}>Workout Plans</Text>
        </View>

        {plansLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#20B2AA" />
            <Text style={styles.loadingText}>Loading workout plans...</Text>
          </View>
        ) : workoutPlans.length > 0 ? (
          workoutPlans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planCardHeader}>
                <View style={styles.planIconContainer}>
                  <Ionicons name="fitness" size={24} color="#20B2AA" />
                </View>
                <View style={styles.planCardInfo}>
                  <Text style={styles.planCardTitle}>{plan.title}</Text>
                  <Text style={styles.planCardSubtitle}>
                    By {plan.professional_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, plan.status === 'active' && styles.statusBadgeActive]}>
                  <Text style={[styles.statusText, plan.status === 'active' && styles.statusTextActive]}>
                    {plan.status}
                  </Text>
                </View>
              </View>

              {plan.description && (
                <Text style={styles.planDescription}>{plan.description}</Text>
              )}

              {plan.content && (
                <View style={styles.planContent}>
                  <Text style={styles.planContentLabel}>Plan Details:</Text>
                  <Text style={styles.planContentText}>
                    {typeof plan.content === 'string' ? plan.content : JSON.stringify(plan.content, null, 2)}
                  </Text>
                </View>
              )}

              {(plan.start_date || plan.end_date) && (
                <View style={styles.planDates}>
                  {plan.start_date && (
                    <Text style={styles.planDateText}>
                      Start: {new Date(plan.start_date).toLocaleDateString()}
                    </Text>
                  )}
                  {plan.end_date && (
                    <Text style={styles.planDateText}>
                      End: {new Date(plan.end_date).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.planActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeletePlan(plan.id, plan.title)}
                >
                  <Ionicons name="trash" size={18} color="#FF6B6B" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="fitness-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No workout plans yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your professional will create a personalized workout plan for you
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderDoctorsTab = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>
        Doctors content will be displayed here
      </Text>
    </View>
  );

  // Show loading screen while userContext or data is loading
  if (userLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Header
          title="Profile"
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
        title={`${user?.full_name || 'User'}'s Profile`}
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
        {activeTab === 'Vitals' && renderVitalsContent()}
        {activeTab === 'Diet Plan' && renderDietPlanTab()}
        {activeTab === 'Workout Plan' && renderWorkoutPlanTab()}
        {activeTab === 'Doctors' && renderDoctorsTab()}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="profile"
        onTabPress={(tabId: string) => {}}
        tabs={bottomTabs}
        role="client"
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  bmiCard: {
    backgroundColor: '#E0F7FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bmiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bmiLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bmiValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bmiNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  bmiUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  bmiPlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  chartCard: {
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
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
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyStateContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  plansContainer: {
    paddingVertical: 8,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F7FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planCardInfo: {
    flex: 1,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  planCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  statusBadgeActive: {
    backgroundColor: '#D4EDDA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: '#155724',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  planContent: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  planContentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  planContentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  planDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planDateText: {
    fontSize: 12,
    color: '#999',
  },
  planActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});
