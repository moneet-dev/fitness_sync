import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface MessageBubbleProps {
  message: string;
  sender: string;
  timestamp: string;
  isOwn: boolean;
  profilePicture?: string;
  style?: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  sender,
  timestamp,
  isOwn,
  style,
}) => {
  return (
    <View style={[styles.container, isOwn ? styles.ownMessage : styles.otherMessage, style]}>
      {!isOwn && (
        <View style={styles.profileSection}>
          <View style={styles.profileImage}>
            <Ionicons name="person" size={16} color="white" />
          </View>
          <Text style={styles.senderName}>{sender}</Text>
        </View>
      )}
      
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
          {message}
        </Text>
        <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
          {timestamp}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  senderName: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: '#20B2AA',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#999',
  },
});
