import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { BottomNavigation, GoalCard, Header, ClientCard } from '@/components';
import { createGoal, getGoals, getClients, updateGoal, createProgressLog } from '@/services/api';
import { useUser } from '@/context/UserContext';

interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  progress: number;
  target_value?: number;
  current_value?: number;
  unit?: string;
  user_id?: number;
}

interface Client {
  id: string;
  full_name: string;
}

export default function GoalSettingScreenRoute() {
  const router = useRouter();
  const { user, isClient, isProfessional, loading: userLoading } = useUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    deadline: '',
    target_value: '',
    current_value: '',
    unit: '',
  });
  const [loading, setLoading] = useState(true);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [progressInput, setProgressInput] = useState('');
  const [progressNotes, setProgressNotes] = useState('');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoals();
      setGoals(goalsData);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (isProfessional) {
      try {
        const clientsData = await getClients(false); // Get assigned clients
        setClients(clientsData);
        if (clientsData.length > 0) {
          setSelectedClient(clientsData[0]);
        }
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      }
    }
  };

  useEffect(() => {
    // Only fetch data after user context has loaded
    if (!userLoading) {
      fetchGoals();
      fetchClients();
    }
  }, [userLoading, isProfessional]);

  const handleBackPress = () => {
    router.back();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  const handleEditGoal = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setSelectedGoal(goal);
      // Set initial value based on current progress or current_value
      if (goal.target_value && goal.current_value !== undefined) {
        setProgressInput(goal.current_value.toString());
      } else {
        setProgressInput(goal.progress.toString());
      }
      setProgressModalVisible(true);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal || !progressInput.trim()) {
      Alert.alert('Error', 'Please enter a valid value');
      return;
    }

    try {
      const inputValue = parseFloat(progressInput);
      if (isNaN(inputValue) || inputValue < 0) {
        Alert.alert('Error', 'Please enter a valid number');
        return;
      }

      // Use createProgressLog which automatically updates the goal
      await createProgressLog(parseInt(selectedGoal.id), {
        value: inputValue,
        notes: progressNotes.trim() || undefined,
      });
      
      Alert.alert('Success', 'Goal progress updated!');
      setProgressModalVisible(false);
      setSelectedGoal(null);
      setProgressInput('');
      setProgressNotes('');
      fetchGoals(); // Refresh goals list
    } catch (error) {
      console.error('Failed to update goal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update goal progress';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleSaveGoal = async () => {
    if (!newGoal.title.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }

    try {
      const goalData: any = {
        title: newGoal.title.trim(),
      };

      // Add optional fields only if provided
      if (newGoal.target_value) {
        const targetVal = parseFloat(newGoal.target_value);
        if (!isNaN(targetVal) && targetVal > 0) {
          goalData.target_value = targetVal;
        }
      }

      if (newGoal.current_value) {
        const currentVal = parseFloat(newGoal.current_value);
        if (!isNaN(currentVal) && currentVal >= 0) {
          goalData.current_value = currentVal;
        }
      }

      if (newGoal.unit && newGoal.unit.trim()) {
        goalData.unit = newGoal.unit.trim();
      }

      if (newGoal.deadline) {
        goalData.deadline = newGoal.deadline;
      }

      await createGoal(goalData);
      Alert.alert('Success', 'Goal created successfully!');
      setNewGoal({ 
        title: '', 
        description: '', 
        deadline: '',
        target_value: '',
        current_value: '',
        unit: '',
      });
      fetchGoals(); // Refetch goals to show the new one
    } catch (error) {
      console.error("Failed to save goal:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create goal';
      Alert.alert('Error', errorMessage);
    }
  };

  const bottomTabs = [
    { id: 'home', label: 'Home', icon: 'home' as const },
    { id: 'chat', label: 'Chat', icon: 'chatbubble' as const },
    { id: 'goals', label: 'Goals', icon: 'flag' as const },
    { id: 'analytics', label: 'Analytics', icon: 'stats-chart' as const },
    { id: 'profile', label: 'Profile', icon: 'person' as const },
  ];

  const handleViewClientGoals = (clientId: string) => {
    router.push({
      pathname: '/client-detail',
      params: { clientId, clientName: clients.find(c => c.id === clientId)?.full_name || 'Client' },
    });
  };

  if (loading || userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text>Loading goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <Header
        title="Goals"
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
        showProfile
        onProfilePress={handleProfilePress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {isProfessional ? (
          // Professional view - show client list with option to view their goals
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Client Goals</Text>
              <Text style={styles.sectionSubtitle}>
                View and manage goals for your assigned clients
              </Text>
              {clients.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No clients assigned yet</Text>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => router.push('/client-assignment')}
                  >
                    <Text style={styles.assignButtonText}>Assign Clients</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={styles.clientRow}
                    onPress={() => handleViewClientGoals(client.id)}
                  >
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.full_name}</Text>
                      <Text style={styles.clientSubtext}>Tap to view goals</Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        ) : (
          // Client view - show personal goals
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Goals</Text>
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  id={goal.id}
                  title={goal.title}
                  deadline={goal.deadline}
                  assignedBy={"Myself"} // Placeholder
                  status={goal.status as any}
                  progress={goal.progress}
                  target_value={goal.target_value}
                  current_value={goal.current_value}
                  unit={goal.unit}
                  onEdit={() => handleEditGoal(goal.id)}
                  onViewHistory={() => router.push({
                    pathname: '/goal-detail',
                    params: {
                      goalId: goal.id,
                      title: goal.title,
                      targetValue: goal.target_value?.toString() || '',
                      unit: goal.unit || '',
                    },
                  })}
                />
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Set a New Goal</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Run a 5k"
                  placeholderTextColor="#999"
                  value={newGoal.title}
                  onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Goal Description</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  placeholder="e.g., Lose 3 kg in 4 weeks, Improve sleep quality..."
                  placeholderTextColor="#999"
                  value={newGoal.description}
                  onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                  multiline
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Target Value (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 70"
                  placeholderTextColor="#999"
                  value={newGoal.target_value}
                  onChangeText={(text) => setNewGoal({ ...newGoal, target_value: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Current Value (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 75"
                  placeholderTextColor="#999"
                  value={newGoal.current_value}
                  onChangeText={(text) => setNewGoal({ ...newGoal, current_value: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Unit (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., kg, minutes, reps"
                  placeholderTextColor="#999"
                  value={newGoal.unit}
                  onChangeText={(text) => setNewGoal({ ...newGoal, unit: text })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Deadline</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 2024-12-31"
                  placeholderTextColor="#999"
                  value={newGoal.deadline}
                  onChangeText={(text) => setNewGoal({ ...newGoal, deadline: text })}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  console.log('Save Goal button pressed', newGoal);
                  handleSaveGoal();
                }}
              >
                <Text style={styles.saveButtonText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <BottomNavigation
        activeTab="goals"
        onTabPress={(tabId: string) => {}}
        tabs={bottomTabs}
        role={isClient ? "client" : "professional"}
      />

      {/* Progress Update Modal */}
      <Modal
        visible={progressModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProgressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Progress</Text>
              <TouchableOpacity onPress={() => setProgressModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedGoal && (
              <View style={styles.modalBody}>
                <Text style={styles.goalTitle}>{selectedGoal.title}</Text>
                
                {selectedGoal.target_value ? (
                  // Show current/target input
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>
                      Current Value (Target: {selectedGoal.target_value} {selectedGoal.unit || ''})
                    </Text>
                    <TextInput
                      style={styles.progressInput}
                      placeholder="Enter current value"
                      keyboardType="numeric"
                      value={progressInput}
                      onChangeText={setProgressInput}
                    />
                  </View>
                ) : (
                  // Show percentage input
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Progress Percentage (0-100)</Text>
                    <TextInput
                      style={styles.progressInput}
                      placeholder="Enter progress percentage"
                      keyboardType="numeric"
                      value={progressInput}
                      onChangeText={setProgressInput}
                    />
                  </View>
                )}

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.progressInput, styles.notesInput]}
                    placeholder="Add notes about this progress..."
                    value={progressNotes}
                    onChangeText={setProgressNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.currentProgress}>
                  <Text style={styles.currentProgressLabel}>Current Progress:</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                      <View 
                        style={[styles.progressBarFill, { width: `${selectedGoal.progress}%` }]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>{Math.round(selectedGoal.progress)}%</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setProgressModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalSaveButton]}
                    onPress={handleUpdateProgress}
                  >
                    <Text style={styles.modalSaveButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: 'white',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  assignButton: {
    backgroundColor: '#20B2AA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  clientRow: {
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
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  clientSubtext: {
    fontSize: 14,
    color: '#666',
  },
  arrow: {
    fontSize: 24,
    color: '#20B2AA',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 16,
  },
  progressInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  currentProgress: {
    marginBottom: 20,
  },
  currentProgressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
    minWidth: 45,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: '#20B2AA',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
