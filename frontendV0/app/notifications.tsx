import { Header, NotificationCard } from '@/components';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/api';


export default function NotificationsScreenRoute() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();

      const mapped = data.map((n: any) => {
        let icon = 'notifications';
        let status = 'Info';

        const t = n.title.toLowerCase();
        if (t.includes('appointment')) {
          icon = 'calendar';
          status = 'Appointment';
        } else if (t.includes('message') || t.includes('chat')) {
          icon = 'chatbubble';
          status = 'Message';
        } else if (t.includes('cancelled') || t.includes('urgent')) {
          icon = 'time';
          status = 'Urgent';
        }

        return {
          id: String(n.id),
          icon,
          title: n.title,
          description: n.message || n.body,
          timestamp: new Date(n.created_at).toLocaleDateString(),
          status,
          is_read: n.is_read,
        };
      });
      setNotifications(mapped);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationRead(parseInt(notificationId), true);
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleProfilePress = () => {
    router.push('/settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <Header
        title="Notifications"
        showBackButton
        onBackPress={handleBackPress}
        showProfile
        onProfilePress={handleProfilePress}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Mark All Read Button */}
        {notifications.some(n => !n.is_read) && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark All as Read</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.notificationsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#20B2AA" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                onPress={() => handleMarkAsRead(notification.id)}
                style={[
                  styles.notificationWrapper,
                  !notification.is_read && styles.unreadNotification
                ]}
              >
                <NotificationCard
                  icon={notification.icon}
                  title={notification.title}
                  description={notification.description}
                  timestamp={notification.timestamp}
                  status={notification.status}
                />
              </TouchableOpacity>
            ))
          )}
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
  notificationsList: {
    paddingVertical: 20,
  },
  headerActions: {
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#20B2AA',
    borderRadius: 8,
  },
  markAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  notificationWrapper: {
    marginBottom: 12,
  },
  unreadNotification: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
