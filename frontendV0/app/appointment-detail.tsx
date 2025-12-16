import { Header } from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { getAppointment, updateAppointment, cancelAppointment } from '@/services/api';

interface Appointment {
  id: number;
  professional_id: number;
  professional_name?: string;
  client_id: number;
  client_name?: string;
  scheduled_at: string;
  status: string;
  mode: string;
  notes?: string;
  created_at: string;
}

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const appointmentId = params.id ? parseInt(params.id as string, 10) : null;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId]);

  const fetchAppointment = async () => {
    if (!appointmentId) return;

    setLoading(true);
    try {
      const data = await getAppointment(appointmentId);
      setAppointment(data);
      setNotes(data.notes || '');
      setSelectedMode(data.mode || '');
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
      Alert.alert('Error', 'Failed to load appointment details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setNotes(appointment?.notes || '');
    setSelectedMode(appointment?.mode || '');
  };

  const handleSave = async () => {
    if (!appointmentId) return;

    setSaving(true);
    try {
      const updates: any = {};
      if (notes !== appointment?.notes) {
        updates.notes = notes;
      }
      if (selectedMode !== appointment?.mode) {
        updates.mode = selectedMode;
      }

      if (Object.keys(updates).length > 0) {
        await updateAppointment(appointmentId, updates);
        Alert.alert('Success', 'Appointment updated successfully');
        await fetchAppointment();
      }
      setEditing(false);
    } catch (error) {
      console.error('Failed to update appointment:', error);
      Alert.alert('Error', 'Failed to update appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!appointmentId) return;
            try {
              await cancelAppointment(appointmentId);
              Alert.alert('Success', 'Appointment cancelled successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              console.error('Failed to cancel appointment:', error);
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const appointmentModes = [
    { id: 'chat', icon: 'chatbubble' as const, label: 'Chat' },
    { id: 'video', icon: 'videocam' as const, label: 'Video Call' },
    { id: 'in-person', icon: 'person' as const, label: 'In-person' },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Header
          title="Appointment Details"
          showBackButton
          onBackPress={handleBackPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Loading appointment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <Header
          title="Appointment Details"
          showBackButton
          onBackPress={handleBackPress}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Appointment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <Header
        title="Appointment Details"
        showBackButton
        onBackPress={handleBackPress}
        rightIcon={editing ? undefined : 'create'}
        onRightIconPress={editing ? undefined : handleEdit}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              appointment.status === 'confirmed' && styles.statusConfirmed,
              appointment.status === 'cancelled' && styles.statusCancelled,
              appointment.status === 'completed' && styles.statusCompleted,
            ]}
          >
            <Text style={styles.statusText}>{appointment.status}</Text>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={24} color="#20B2AA" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatDate(appointment.scheduled_at)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="time" size={24} color="#20B2AA" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>{formatTime(appointment.scheduled_at)}</Text>
            </View>
          </View>
        </View>

        {/* Professional/Client Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={24} color="#20B2AA" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {appointment.professional_name ? 'Professional' : 'Client'}
              </Text>
              <Text style={styles.infoValue}>
                {appointment.professional_name || appointment.client_name || 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Appointment Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Mode</Text>
          {editing ? (
            <View style={styles.modesGrid}>
              {appointmentModes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeButton,
                    selectedMode === mode.id && styles.modeButtonSelected,
                  ]}
                  onPress={() => setSelectedMode(mode.id)}
                >
                  <Ionicons
                    name={mode.icon}
                    size={24}
                    color={selectedMode === mode.id ? 'white' : '#20B2AA'}
                  />
                  <Text
                    style={[
                      styles.modeLabel,
                      selectedMode === mode.id && styles.modeLabelSelected,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.modeDisplay}>
              <Ionicons
                name={
                  appointmentModes.find((m) => m.id === appointment.mode)?.icon ||
                  'help-circle'
                }
                size={24}
                color="#20B2AA"
              />
              <Text style={styles.modeDisplayText}>
                {appointmentModes.find((m) => m.id === appointment.mode)?.label ||
                  appointment.mode}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {editing ? (
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes for this appointment..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <View style={styles.notesDisplay}>
              <Text style={styles.notesText}>
                {appointment.notes || 'No notes added'}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {editing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelEdit}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          appointment.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelAppointmentButton]}
              onPress={handleCancel}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.cancelAppointmentButtonText}>Cancel Appointment</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  statusConfirmed: {
    backgroundColor: '#D4EDDA',
  },
  statusCancelled: {
    backgroundColor: '#F8D7DA',
  },
  statusCompleted: {
    backgroundColor: '#D1ECF1',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#20B2AA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modeButtonSelected: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  modeLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#20B2AA',
  },
  modeLabelSelected: {
    color: 'white',
  },
  modeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  modeDisplayText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  notesInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
  },
  notesDisplay: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
  },
  notesText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#20B2AA',
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelAppointmentButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    marginBottom: 20,
  },
  cancelAppointmentButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});
