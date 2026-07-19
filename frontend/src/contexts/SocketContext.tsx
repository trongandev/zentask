import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { ArenaChallengeModal } from "../pages/Arena/components/ArenaChallengeModal";
import toastService from "../services/toastService";
import axiosInstance from "@/src/services/axiosConfig";

const API_URL = import.meta.env.VITE_API_BACKEND;
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

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, initialNotifications } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [notifications, setNotifications] = useState<any[]>(initialNotifications || []);
    const [incomingChallenge, setIncomingChallenge] = useState<any>(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const res = await axiosInstance.get(`/api/notifications`);
            setNotifications(res.data);
        } catch (error) {
            console.error("Error fetching notifications", error);
        }
    };

    const markAsRead = async (id?: string) => {
        try {
            const url = id ? `${API_URL}/api/notifications/${id}/read` : `${API_URL}/api/notifications/read-all`;

            const res = await axiosInstance.put(url);
            setNotifications((prev) => (id ? prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : prev.map((n) => ({ ...n, isRead: true }))));
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
        const newSocket = io(API_URL, {
            withCredentials: true,
        });

        newSocket.on("connect", () => {
            newSocket.emit("register", user.uid);
        });

        newSocket.on("new_notification", (notification) => {
            setNotifications((prev) => [notification, ...prev]);
            toastService.info(notification.title, { icon: "🔔" });
        });

        newSocket.on("arena_challenge_received", (data: any) => {
            setIncomingChallenge(data);
        });

        newSocket.on("arena_challenge_expired", (data: any) => {
            setIncomingChallenge((prev: any) => (prev?.challengeId === data.challengeId ? null : prev));
        });

        setSocket(newSocket);
        setNotifications(initialNotifications || []);

        return () => {
            newSocket.off("new_notification");
            newSocket.off("arena_challenge_received");
            newSocket.off("arena_challenge_expired");
            newSocket.disconnect();
        };
    }, [user, initialNotifications]);

    const handleAcceptChallenge = () => {
        if (!socket || !incomingChallenge || !user) return;
        socket.emit("arena_challenge_response", {
            challengerUid: incomingChallenge.uid,
            accepted: true,
            challengeId: incomingChallenge.challengeId,
            responder: {
                uid: user.uid,
                name: user.displayName || "Bạn",
                avatar: user.photoURL || "",
                rankInfo: `${(user as any)?.rankInfo || ""}`,
                rankId: user.rankId || 1,
                tier: user.tier || 3,
                level: user.level,
            },
        });
        setIncomingChallenge(null);
        navigate("/arena");
    };

    const handleDeclineChallenge = () => {
        if (!socket || !incomingChallenge) return;
        socket.emit("arena_challenge_response", {
            challengerUid: incomingChallenge.uid,
            accepted: false,
            challengeId: incomingChallenge.challengeId,
        });
        setIncomingChallenge(null);
    };

    return (
        <SocketContext.Provider value={{ socket, notifications, setNotifications, fetchNotifications, markAsRead }}>
            {children}
            {incomingChallenge && <ArenaChallengeModal challenger={incomingChallenge} onAccept={handleAcceptChallenge} onDecline={handleDeclineChallenge} />}
        </SocketContext.Provider>
    );
}
