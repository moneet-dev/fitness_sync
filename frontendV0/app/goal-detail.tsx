import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { Header } from '@/components';
import { getProgressLogs, createProgressLog } from '@/services/api';

interface ProgressLog {
  id: number;
  goal_id: number;
  value: number;
  progress_percentage: number;
  notes?: string;
  logged_at: string;
}

export default function GoalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const goalId = params.goalId as string;
  const goalTitle = params.title as string;
  const targetValue = params.targetValue ? parseFloat(params.targetValue as string) : undefined;
  const unit = params.unit as string | undefined;

  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const logsData = await getProgressLogs(parseInt(goalId));
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to fetch progress logs:', error);
      Alert.alert('Error', 'Failed to load progress history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (goalId) {
      fetchLogs();
    }
  }, [goalId]);

  const handleAddLog = async () => {
    if (!newValue.trim()) {
      Alert.alert('Error', 'Please enter a value');
      return;
    }

    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) {
      Alert.alert('Error', 'Please enter a valid number');
      return;
    }

    try {
      await createProgressLog(parseInt(goalId), {
        value,
        notes: newNotes.trim() || undefined,
      });

      Alert.alert('Success', 'Progress logged successfully!');
      setAddModalVisible(false);
      setNewValue('');
      setNewNotes('');
      fetchLogs();
    } catch (error) {
      console.error('Failed to log progress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to log progress';
      Alert.alert('Error', errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getProgressChange = (index: number): number | null => {
    if (index === logs.length - 1) return null; // First entry
    return logs[index].progress_percentage - logs[index + 1].progress_percentage;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <Header
        title="Progress History"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.goalInfo}>
          <Text style={styles.goalTitle}>{goalTitle}</Text>
          {targetValue && (
            <Text style={styles.targetInfo}>
              Target: {targetValue} {unit || ''}
            </Text>
          )}
        </View>

        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Progress Timeline</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Ionicons name="add-circle" size={24} color="#20B2AA" />
            <Text style={styles.addButtonText}>Log Progress</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#20B2AA" style={styles.loader} />
        ) : logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No progress logged yet</Text>
            <Text style={styles.emptySubtext}>Tap "Log Progress" to add your first entry</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {logs.map((log, index) => {
              const progressChange = getProgressChange(index);
              return (
                <View key={log.id} style={styles.timelineItem}>
                  <View style={styles.timelineMarker}>
                    <View style={styles.timelineDot} />
                    {index < logs.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.logCard}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logValue}>
                        {log.value} {unit || ''}
                      </Text>
                      <Text style={styles.logDate}>{formatDate(log.logged_at)}</Text>
                    </View>
                    <View style={styles.progressInfo}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(log.progress_percentage, 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {Math.round(log.progress_percentage)}%
                      </Text>
                      {progressChange !== null && (
                        <View style={[
                          styles.changeBadge,
                          progressChange >= 0 ? styles.positiveChange : styles.negativeChange
                        ]}>
                          <Ionicons
                            name={progressChange >= 0 ? 'trending-up' : 'trending-down'}
                            size={12}
                            color={progressChange >= 0 ? '#4CAF50' : '#F44336'}
                          />
                          <Text style={[
                            styles.changeText,
                            progressChange >= 0 ? styles.positiveText : styles.negativeText
                          ]}>
                            {progressChange >= 0 ? '+' : ''}{Math.round(progressChange)}%
                          </Text>
                        </View>
                      )}
                    </View>
                    {log.notes && (
                      <Text style={styles.logNotes}>{log.notes}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Progress Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Progress</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>
                  {targetValue ? `Value (Target: ${targetValue} ${unit || ''})` : 'Value'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter value"
                  keyboardType="numeric"
                  value={newValue}
                  onChangeText={setNewValue}
                />
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Add notes about this progress..."
                  value={newNotes}
                  onChangeText={setNewNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddLog}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  },
  goalInfo: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  targetInfo: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  timeline: {
    padding: 20,
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#20B2AA',
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E0E0E0',
    marginTop: 4,
  },
  logCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
    minWidth: 40,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  positiveChange: {
    backgroundColor: '#E8F5E9',
  },
  negativeChange: {
    backgroundColor: '#FFEBEE',
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  positiveText: {
    color: '#4CAF50',
  },
  negativeText: {
    color: '#F44336',
  },
  logNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
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
    width: '100%',
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
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  saveButton: {
    backgroundColor: '#20B2AA',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
