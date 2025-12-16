import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { BottomNavigation, Header, MetricCard, GoalCard, TaskCard } from '@/components';
import {
  getClientMetrics,
  getClientGoals,
  getClientTasks,
  getClientNotes,
  createClientNote,
} from '@/services/api';
import { useUser } from '@/context/UserContext';

export default function ClientDetailScreen() {
  const router = useRouter();
  const { user, isProfessional } = useUser();
  const { clientId, clientName } = useLocalSearchParams();
  const id = clientId ? Number(clientId) : null;
  const name = typeof clientName === 'string' ? clientName : 'Client';

  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'goals' | 'tasks' | 'notes'>('overview');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!id || !isProfessional) {
      Alert.alert('Error', 'Invalid access');
      router.back();
      return;
    }
    loadData();
  }, [id, isProfessional]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [metricsData, goalsData, tasksData, notesData] = await Promise.all([
        getClientMetrics(id),
        getClientGoals(id),
        getClientTasks(id),
        getClientNotes(id),
      ]);
      setMetrics(metricsData || []);
      setGoals(goalsData || []);
      setTasks(tasksData || []);
      setNotes(notesData || []);
    } catch (err) {
      console.error('Failed to load client data', err);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    setAddingNote(true);
    try {
      const note = await createClientNote(id, newNote.trim());
      setNotes([note, ...notes]);
      setNewNote('');
      Alert.alert('Success', 'Note added successfully');
    } catch (err: any) {
      console.error('Failed to add note', err);
      Alert.alert('Error', err?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // Calculate summary stats
  const latestWeight = metrics.find((m) => m.metric_type === 'weight')?.value || 0;
  const avgSteps = Math.round(
    metrics.filter((m) => m.metric_type === 'steps').reduce((sum, m) => sum + m.value, 0) /
      metrics.filter((m) => m.metric_type === 'steps').length || 0
  );
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

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
        title={name}
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'metrics' && styles.activeTab]}
          onPress={() => setActiveTab('metrics')}
        >
          <Text style={[styles.tabText, activeTab === 'metrics' && styles.activeTabText]}>
            Metrics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'goals' && styles.activeTab]}
          onPress={() => setActiveTab('goals')}
        >
          <Text style={[styles.tabText, activeTab === 'goals' && styles.activeTabText]}>
            Goals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>
            Tasks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>
            Notes
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Loading client data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="fitness" size={24} color="#20B2AA" />
                  <Text style={styles.statValue}>{latestWeight.toFixed(1)} kg</Text>
                  <Text style={styles.statLabel}>Weight</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="walk" size={24} color="#20B2AA" />
                  <Text style={styles.statValue}>{avgSteps}</Text>
                  <Text style={styles.statLabel}>Avg Steps</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flag" size={24} color="#20B2AA" />
                  <Text style={styles.statValue}>{completedGoals}/{goals.length}</Text>
                  <Text style={styles.statLabel}>Goals</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={24} color="#20B2AA" />
                  <Text style={styles.statValue}>{completedTasks}/{tasks.length}</Text>
                  <Text style={styles.statLabel}>Tasks</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {metrics.slice(0, 3).map((metric) => (
                <View key={metric.id} style={styles.activityItem}>
                  <Ionicons name="pulse" size={20} color="#20B2AA" />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityText}>
                      {metric.metric_type}: {metric.value} {metric.unit}
                    </Text>
                    <Text style={styles.activityTime}>
                      {new Date(metric.recorded_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'metrics' && (
            <View style={styles.tabContent}>
              {metrics.length > 0 ? (
                metrics.map((metric) => (
                  <MetricCard
                    key={metric.id}
                    label={metric.metric_type}
                    value={`${metric.value} ${metric.unit || ''}`}
                    icon="pulse"
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="pulse-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyText}>No metrics recorded</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'goals' && (
            <View style={styles.tabContent}>
              {goals.length > 0 ? (
                goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    title={goal.title}
                    assignedBy={goal.assigned_by || 'Self'}
                    progress={goal.progress}
                    deadline={goal.deadline}
                    status={goal.status === 'completed' ? 'Completed' : goal.status === 'in-progress' ? 'In Progress' : 'Pending'}
                    onEdit={() => {}}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="flag-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyText}>No goals set</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'tasks' && (
            <View style={styles.tabContent}>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    title={task.title}
                    description={task.description}
                    isCompleted={task.status === 'completed'}
                    status={task.status === 'completed' ? 'Completed' : 'Upcoming'}
                    onToggle={() => {}}
                  />
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="list-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyText}>No tasks assigned</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'notes' && (
            <View style={styles.tabContent}>
              {/* Add Note Form */}
              <View style={styles.noteForm}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note about this client..."
                  placeholderTextColor="#999"
                  value={newNote}
                  onChangeText={setNewNote}
                  multiline
                  numberOfLines={3}
                />
                <TouchableOpacity
                  style={[styles.addNoteButton, addingNote && styles.buttonDisabled]}
                  onPress={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                >
                  {addingNote ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color="white" />
                      <Text style={styles.addNoteText}>Add Note</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Notes List */}
              {notes.length > 0 ? (
                notes.map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteProfessional}>{note.professional_name}</Text>
                      <Text style={styles.noteDate}>
                        {new Date(note.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.noteContent}>{note.content}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={64} color="#CCC" />
                  <Text style={styles.emptyText}>No notes yet</Text>
                </View>
              )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#20B2AA',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#20B2AA',
    fontWeight: '600',
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
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  noteForm: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  addNoteButton: {
    backgroundColor: '#20B2AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addNoteText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  noteCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteProfessional: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  noteContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
