import { Calendar, Header, ModeButton, TimeSlotButton } from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AppointmentBookingScreen () {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date()); // Current date
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        const { getProfessionals } = await import('@/services/api');
        const pros = await getProfessionals();
        setProfessionals(pros || []);
      } catch (err) {
        console.error('Failed to load professionals', err);
      }
    };
    loadProfessionals();
  }, []);

  const handleBackPress = () => {
    router.back();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotSelect = (time: string) => {
    setSelectedTimeSlot(time);
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
  };

  const handleConfirmBooking = () => {
    // Basic booking flow: send appointment to backend
    (async () => {
      if (!selectedProfessionalId) {
        alert('Please select a professional');
        return;
      }
      if (!selectedTimeSlot) {
        alert('Please select a time slot');
        return;
      }
      if (!selectedMode) {
        alert('Please select appointment mode');
        return;
      }

      // Parse selectedTimeSlot like '09:00 AM'
      const parseTime = (t: string) => {
        const parts = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!parts) return { h: 9, m: 0 };
        let h = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        const ampm = parts[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return { h, m };
      };

      const { h, m } = parseTime(selectedTimeSlot);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);

      try {
        const iso = dt.toISOString();
        const { createAppointment } = await import('@/services/api');
        await createAppointment({ professional_id: selectedProfessionalId, scheduled_at: iso, mode: selectedMode });
        alert('Appointment created');
        router.back();
      } catch (err) {
        console.error('Booking failed', err);
        alert('Failed to book appointment');
      }
    })();
  };

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM',
  ];

  const appointmentModes = [
    { id: 'chat', icon: 'chatbubble' as const, label: 'Chat' },
    { id: 'video', icon: 'videocam' as const, label: 'Video Call' },
    { id: 'in-person', icon: 'person' as const, label: 'In-person' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {/* Header */}
      <Header
        title="Book Appointment"
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
        showProfile
        onProfilePress={handleProfilePress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Select Professional Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Professional</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => {/* no-op for now */}}>
              <Text style={styles.dropdownText}>{selectedProfessionalId ? (professionals.find(p => p.id === selectedProfessionalId)?.full_name ?? 'Selected') : 'Choose a professional'}</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </View>
          {/* Simple list of professionals */}
          {professionals.map((p) => (
            <TouchableOpacity key={p.id} style={{ paddingVertical: 8 }} onPress={async () => {
              setSelectedProfessionalId(p.id);
              try {
                const { getAvailability } = await import('@/services/api');
                const res = await getAvailability(p.id);
                setAvailability(res?.slots || []);
              } catch (err) {
                console.error('Failed to load availability', err);
              }
            }}>
              <Text>{p.full_name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Select Date Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </View>

        {/* Select Time Slot Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          <View style={styles.timeSlotsGrid}>
            {timeSlots.map((time) => (
              <TimeSlotButton
                key={time}
                time={time}
                isSelected={selectedTimeSlot === time}
                onPress={() => handleTimeSlotSelect(time)}
              />
            ))}
          </View>
        </View>

        {/* Select Appointment Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Appointment Mode</Text>
          <View style={styles.modesGrid}>
            {appointmentModes.map((mode) => (
              <ModeButton
                key={mode.id}
                icon={mode.icon}
                label={mode.label}
                isSelected={selectedMode === mode.id}
                onPress={() => handleModeSelect(mode.id)}
              />
            ))}
          </View>
        </View>

        {/* Confirm Booking Button */}
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => {
            console.log('Confirm Booking button pressed', {
              selectedProfessionalId,
              selectedDate,
              selectedTimeSlot,
              selectedMode
            });
            handleConfirmBooking();
          }}
        >
          <Text style={styles.confirmButtonText}>Confirm Booking</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with</Text>
          <View style={styles.vLogo}>
            <Text style={styles.vLogoText}>V</Text>
          </View>
        </View>
      </ScrollView>
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
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownText: {
    fontSize: 16,
    color: '#666',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
});
