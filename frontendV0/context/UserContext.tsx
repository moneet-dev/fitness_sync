import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUser } from '@/services/api';
import { getAuthToken } from '@/services/auth';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  isClient: boolean;
  isProfessional: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      // Check if token exists before fetching
      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to load user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshUser = async () => {
    await fetchUser();
  };

  const isClient = user?.role === 'client';
  const isProfessional = user?.role === 'doctor' || user?.role === 'trainer' || user?.role === 'nutritionist';

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser,
        isClient,
        isProfessional,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
