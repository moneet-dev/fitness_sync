import { getAuthToken, initAuth } from './auth';
import { API_URL } from '@/constants/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

const apiRequest = async (endpoint: string, options: RequestOptions = {}) => {
  // Ensure persisted token is loaded into memory before reading it.
  // `initAuth()` is idempotent and fast when token already loaded.
  try {
    await initAuth();
  } catch (err) {
    // ignore; getAuthToken will return null if init fails
  }
  const token = getAuthToken();
  
  if (!token) {
    console.warn('[API] No auth token available for request:', endpoint);
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : null,
  });

  if (response.status === 204) { // No Content
    return null;
  }
  
  if (response.status === 401) {
    console.error('[API] 401 Unauthorized - Token may be invalid or expired');
    throw new Error('Authentication required. Please log in again.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'API request failed');
  }

  return data;
};

export const getMetrics = async () => {
  const metrics = await apiRequest('/data/metrics');
  // Backend uses `metric_type`; frontend expects `type`.
  if (Array.isArray(metrics)) {
    return metrics.map((m: any) => ({ ...m, type: m.metric_type ?? m.type }));
  }
  return metrics;
};
export const getTasks = () => apiRequest('/data/tasks');
export const getGoals = () => apiRequest('/data/goals');
export const getAppointments = () => apiRequest('/appointments');
export const getProfessionals = () => apiRequest('/users/professionals');
export const getClients = () => apiRequest('/users/clients');
export const createGoal = (goalData: { title: string; description: string; deadline: string; }) => apiRequest('/data/goals', {
  method: 'POST',
  // normalize status value to match backend convention
  body: { ...goalData, status: 'in-progress', progress: 0 },
});

export const updateGoal = (goalId: number, goalData: any) => apiRequest(`/data/goals/${goalId}`, {
  method: 'PATCH',
  body: goalData,
});

export const createProgressLog = (goalId: number, logData: { value: number; notes?: string }) => 
  apiRequest(`/data/goals/${goalId}/logs`, {
    method: 'POST',
    body: logData,
  });

export const getProgressLogs = (goalId: number) => 
  apiRequest(`/data/goals/${goalId}/logs`);

// Appointments
export const getAvailability = (professionalId: number) => apiRequest(`/appointments/availability?professional_id=${professionalId}`);
export const createAppointment = (payload: { professional_id: number; scheduled_at: string; mode?: string; notes?: string; }) => apiRequest('/appointments', { method: 'POST', body: payload });
export const getAppointment = (appointmentId: number) => apiRequest(`/appointments/${appointmentId}`);

// Chat

export const getMessages = (conversationId: number) => apiRequest(`/chat/messages/${conversationId}`);

export const sendMessage = (conversationId: number, content: string) => apiRequest('/chat/messages', { method: 'POST', body: { conversation_id: conversationId, content } });

export const createConversation = (participantIds: number | number[]) => {
  // Support both single ID (backwards compat) and array of IDs
  const ids = Array.isArray(participantIds) ? participantIds : [participantIds];
  return apiRequest('/chat/conversations', { 
    method: 'POST', 
    body: { participant_ids: ids } 
  });
};

export const getCareTeamConversation = () => apiRequest('/chat/care-team-thread', { method: 'POST' });

export const getConversations = () => apiRequest('/chat/conversations');

export const markConversationRead = (conversationId: number) => apiRequest(`/chat/conversations/${conversationId}/mark-read`, { method: 'PATCH' });

export const updateTypingStatus = (conversationId: number) => apiRequest(`/chat/conversations/${conversationId}/typing`, { method: 'POST' });

export const getTypingStatus = (conversationId: number) => apiRequest(`/chat/conversations/${conversationId}/typing`);

// Notifications
export const getNotifications = () => apiRequest('/notifications/');

// User Profile
export const getCurrentUser = () => apiRequest('/auth/me');

export const updateUserProfile = (userData: { full_name?: string; email?: string }) => apiRequest('/auth/me', { method: 'PATCH', body: userData });

// Assignments
export const getMyProfessionals = () => apiRequest('/users/my-professionals');

export const generateInviteCode = (expiresInHours: number = 24) => 
  apiRequest('/users/invite-code', { 
    method: 'POST', 
    body: { expires_in_hours: expiresInHours } 
  });

export const connectWithCode = (inviteCode: string) => 
  apiRequest('/users/connect', { 
    method: 'POST', 
    body: { invite_code: inviteCode } 
  });

export const createAssignment = (clientId: number, professionalId: number) => 
  apiRequest('/users/assignments', { 
    method: 'POST', 
    body: { client_id: clientId, professional_id: professionalId } 
  });

export const deleteAssignment = (assignmentId: number) => 
  apiRequest(`/users/assignments/${assignmentId}`, { method: 'DELETE' });

// Client data access (for professionals)
export const getClientMetrics = (clientId: number) => apiRequest(`/users/clients/${clientId}/metrics`);

export const getClientGoals = (clientId: number) => apiRequest(`/users/clients/${clientId}/goals`);

export const getClientTasks = (clientId: number) => apiRequest(`/users/clients/${clientId}/tasks`);

// Notes
export const getClientNotes = (clientId: number) => apiRequest(`/users/clients/${clientId}/notes`);

export const createClientNote = (clientId: number, content: string) => 
  apiRequest(`/users/clients/${clientId}/notes`, { 
    method: 'POST', 
    body: { client_id: clientId, content } 
  });

// Professional stats
export const getProfessionalStats = () => apiRequest('/users/professional/stats');

// Plans
export const getPlans = (planType?: string) => 
  apiRequest(`/plans/${planType ? `?plan_type=${planType}` : ''}`);

export const getPlan = (planId: number) => apiRequest(`/plans/${planId}`);

export const createPlan = (planData: {
  client_id: number;
  plan_type: string;
  title: string;
  description?: string;
  content: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}) => apiRequest('/plans', { method: 'POST', body: planData });

export const updatePlan = (planId: number, planData: {
  title?: string;
  description?: string;
  content?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}) => apiRequest(`/plans/${planId}`, { method: 'PATCH', body: planData });

export const deletePlan = (planId: number) => 
  apiRequest(`/plans/${planId}`, { method: 'DELETE' });

// Appointment management
export const updateAppointment = (appointmentId: number, appointmentData: {
  scheduled_at?: string;
  mode?: string;
  notes?: string;
  status?: string;
}) => apiRequest(`/appointments/${appointmentId}`, { method: 'PATCH', body: appointmentData });

export const cancelAppointment = (appointmentId: number) => 
  apiRequest(`/appointments/${appointmentId}`, { method: 'DELETE' });

// Notification management
export const markNotificationRead = (notificationId: number, isRead: boolean = true) =>
  apiRequest(`/notifications/${notificationId}`, { 
    method: 'PATCH', 
    body: { is_read: isRead } 
  });

export const markAllNotificationsRead = () =>
  apiRequest('/notifications/mark-all-read', { method: 'POST' });

export default apiRequest;
