import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  notifications: any[];
  setNotifications: (n: any[]) => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id?: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  notifications: [],
  setNotifications: () => {},
  fetchNotifications: async () => {},
  markAsRead: async () => {},
});

export const useSocket = () => useContext(SocketContext);

const API_URL = import.meta.env.VITE_API_BACKEND;

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, initialNotifications } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>(initialNotifications || []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications", error);
    }
  };

  const markAsRead = async (id?: string) => {
    try {
      const url = id 
        ? `${API_URL}/api/notifications/${id}/read` 
        : `${API_URL}/api/notifications/read-all`;
        
      const res = await fetch(url, { method: "PUT", credentials: "include" });
      if (res.ok) {
        setNotifications(prev => 
          id 
            ? prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            : prev.map(n => ({ ...n, isRead: true }))
        );
      }
    } catch (error) {
      console.error("Error marking as read", error);
    }
  };

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect socket
    const newSocket = io(API_URL || "http://localhost:3001", {
      withCredentials: true
    });

    newSocket.on("connect", () => {
      newSocket.emit("register", user.uid);
    });

    newSocket.on("new_notification", (notification) => {
      setNotifications(prev => [notification, ...prev]);
      toast(notification.title, { icon: "🔔" });
    });

    setSocket(newSocket);
    setNotifications(initialNotifications || []);

    return () => {
      newSocket.disconnect();
    };
  }, [user, initialNotifications]);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications, fetchNotifications, markAsRead }}>
      {children}
    </SocketContext.Provider>
  );
}
