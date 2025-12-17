import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Modal,
} from 'react-native';
import { BottomNavigation, Header, MessageBubble } from '@/components';
import { 
  getMessages, 
  sendMessage, 
  markConversationRead, 
  updateTypingStatus, 
  getTypingStatus,
  getConversations
} from '@/services/api';
import { useUser } from '@/context/UserContext';

export default function ChatScreenRoute() {
  const router = useRouter();
  const { user, isClient } = useUser();
  const { conversationId } = useLocalSearchParams();
  const convId = conversationId ? Number(conversationId) : null;

  const [message, setMessage] = useState('');
  const [messagesState, setMessagesState] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [conversationTitle, setConversationTitle] = useState('Chat');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Fetch conversation details for header
  useEffect(() => {
    const fetchConversationInfo = async () => {
      if (!convId) return;
      try {
        const conversations = await getConversations();
        const currentConv = conversations.find((c: any) => c.id === convId);
        if (currentConv) {
          // Use "Care Team" for groups, or participant name for 1:1
          if (currentConv.is_group) {
            setConversationTitle('Care Team');
          } else if (currentConv.other_participant_name) {
            setConversationTitle(currentConv.other_participant_name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch conversation info', err);
      }
    };
    fetchConversationInfo();
  }, [convId]);

  // Mark conversation as read when opening
  useEffect(() => {
    if (convId) {
      markConversationRead(convId).catch(err => 
        console.error('Failed to mark as read:', err)
      );
    }
  }, [convId]);

  // Fetch messages initially
  useEffect(() => {
    const fetchMessages = async () => {
      if (!convId) return;
      try {
        const msgs = await getMessages(convId);
        setMessagesState(msgs || []);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };
    fetchMessages();
  }, [convId]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!convId) return;
    
    const interval = setInterval(async () => {
      try {
        const msgs = await getMessages(convId);
        setMessagesState(msgs || []);
      } catch (err) {
        console.error('Failed to poll messages', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [convId]);

  // Poll for typing status every 2 seconds
  useEffect(() => {
    if (!convId) return;
    
    const interval = setInterval(async () => {
      try {
        const typing = await getTypingStatus(convId);
        if (Array.isArray(typing)) {
          setTypingUsers(typing.filter((t: any) => t.is_typing).map((t: any) => t.user_name));
        }
      } catch (err) {
        console.error('Failed to poll typing status', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [convId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messagesState]);

  const handleBackPress = () => {
    router.back();
  };

  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    // Send typing indicator
    if (convId && text.length > 0) {
      updateTypingStatus(convId).catch(err => 
        console.error('Failed to update typing status:', err)
      );
      
      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 3 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        // Typing indicator will expire on backend after 5 seconds
      }, 3000);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !convId) return;
    try {
      const sent = await sendMessage(convId, message.trim());
      setMessagesState((s) => [...s, sent]);
      setMessage('');
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (err: any) {
      console.error('Send failed', err);
      Alert.alert('Error', err?.message || 'Failed to send message');
    }
  };

  const handleAttachment = () => {
    // TODO: Implement attachment logic
    console.log('Attachment pressed');
  };

  const handleRequestAppointment = () => {
    // Pre-fill with tomorrow's date at 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    setSelectedTime('10:00');
    setShowAppointmentModal(true);
  };

  const handleConfirmAppointmentRequest = () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select both date and time');
      return;
    }
    
    const dateObj = new Date(selectedDate + 'T' + selectedTime);
    const dateStr = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const requestMessage = `I would like to request an appointment for ${dateStr} at ${timeStr}.`;
    setMessage(requestMessage);
    setShowAppointmentModal(false);
  };

  const messages = messagesState.length > 0 ? messagesState.map((m) => ({
    id: String(m.id),
    message: m.content,
    sender: m.sender_name || 'Unknown',
    timestamp: new Date(m.created_at).toLocaleTimeString(),
    isOwn: user ? m.sender_id === user.id : false,
  })) : [];

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

      {/* Header */}
      <Header
        title={conversationTitle}
        showBackButton
        onBackPress={handleBackPress}
        rightIcon="notifications"
        onRightIconPress={handleNotificationPress}
      />

      {/* Chat Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer} 
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg.message}
            sender={msg.sender}
            timestamp={msg.timestamp}
            isOwn={msg.isOwn}
          />
        ))}
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={handleRequestAppointment}
        >
          <Ionicons name="calendar-outline" size={18} color="#20B2AA" />
          <Text style={styles.quickActionText}>Request Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachmentButton} onPress={handleAttachment}>
          <Ionicons name="attach" size={20} color="#666" />
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          value={message}
          onChangeText={handleTextChange}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab="chat"
        onTabPress={(tabId: string) => {
          // Optionally handle tab press here
        }}
        tabs={bottomTabs}
        role={isClient ? 'client' : 'professional'}
      />

      {/* Appointment Request Modal */}
      <Modal
        visible={showAppointmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Appointment</Text>
              <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Select Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              value={selectedDate}
              onChangeText={setSelectedDate}
            />

            <Text style={styles.modalLabel}>Select Time</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="HH:MM (e.g., 14:30)"
              placeholderTextColor="#999"
              value={selectedTime}
              onChangeText={setSelectedTime}
            />

            <Text style={styles.modalDescription}>
              This will send a message to your care team requesting an appointment.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowAppointmentModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleConfirmAppointmentRequest}
              >
                <Text style={styles.modalConfirmText}>Insert Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  messagesContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  attachmentButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#20B2AA',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#20B2AA',
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 13,
    color: '#20B2AA',
    marginLeft: 6,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  dateInput: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
