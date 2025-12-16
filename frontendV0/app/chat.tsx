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
} from 'react-native';
import { BottomNavigation, Header, MessageBubble } from '@/components';
import { 
  getMessages, 
  sendMessage, 
  markConversationRead, 
  updateTypingStatus, 
  getTypingStatus 
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
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<any>(null);

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
        title="Chat"
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
});
