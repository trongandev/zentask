import { useState, useEffect, useRef } from "react";
import { X, Send, Minimize2, Maximize2 } from "lucide-react";
import { friendsService } from "../services/friendsService";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import { cn } from "../lib/utils";

export function FloatingChat({ 
  friend, 
  onClose, 
  index = 0,
  isMinimized = false,
  onMinimize,
  onMaximize
}: { 
  friend: any; 
  onClose: () => void; 
  index?: number;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMinimized) setUnreadCount(0);
  }, [isMinimized]);

  useEffect(() => {
    if (!friend) return;
    const fetchMessages = async () => {
      try {
        const msgs = await friendsService.getMessages(friend.friendId);
        setMessages(msgs);
        setTimeout(() => scrollToBottom(), 100);
      } catch (error) {
        console.error(error);
      }
    };
    fetchMessages();
  }, [friend]);

  useEffect(() => {
    if (!socket || !friend) return;
    const handleReceive = (payload: any) => {
      if (payload.senderId === friend.friendId || payload.senderId === user?.uid) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        setTimeout(() => scrollToBottom(), 100);
        if (isMinimized && payload.senderId !== user?.uid) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    };
    socket.on("receive_message", handleReceive);
    return () => {
      socket.off("receive_message", handleReceive);
    };
  }, [socket, friend, user, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      const txt = text.trim();
      setText("");
      const msg = await friendsService.sendMessage(friend.friendId, txt);
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error(error);
    }
  };

  if (!friend) return null;

  const lastMessage = messages[messages.length - 1];

  if (isMinimized) {
    return (
      <div 
        className="fixed z-[100] group cursor-pointer transition-all duration-300"
        style={{ bottom: 16 + index * 70, right: 380 }}
        onClick={() => onMaximize && onMaximize()}
      >
        <div className="relative flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-all hover:scale-105">
           <UserAvatar src={friend.photoURL || "https://ui-avatars.com/api/?name=User"} level={friend.level || 1} uid={friend.friendId} disableLink={true} className="w-12 h-12" />
           <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-[3px] border-white rounded-full z-20"></div>
           {unreadCount > 0 && (
             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full font-bold shadow-sm z-30">{unreadCount}</span>
           )}
           
           <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl flex flex-col max-w-[250px] z-50">
             <span className="font-bold mb-0.5 truncate">{friend.displayName}</span>
             <span className="text-gray-300 text-xs truncate max-w-[200px]">
               {lastMessage ? (lastMessage.senderId === user?.uid ? `Bạn: ${lastMessage.text}` : lastMessage.text) : "Bắt đầu cuộc trò chuyện"}
             </span>
             <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-[6px] border-transparent border-l-gray-900"></div>
           </div>
           
           <button 
             onClick={(e) => { e.stopPropagation(); onClose(); }}
             className="absolute -top-1 -left-1 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-white hover:bg-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-40"
           >
             <X className="w-3 h-3" />
           </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed bottom-0 bg-white border border-gray-200 rounded-t-xl shadow-2xl flex flex-col z-[100] transition-all w-[320px] h-[450px]"
      style={{ right: 380 + index * 340 }}
    >
      <div className="h-12 bg-blue-600 rounded-t-xl px-4 flex items-center justify-between text-white cursor-pointer" onClick={() => onMinimize && onMinimize()}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <div className="relative flex items-center">
            <UserAvatar src={friend.photoURL || "https://ui-avatars.com/api/?name=User"} level={friend.level || 1} uid={friend.friendId} disableLink={isMinimized} className="w-8 h-8" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full z-20"></div>
          </div>
          <span className="truncate max-w-[150px]">{friend.displayName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (onMinimize) onMinimize();
            }}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            className="p-1 hover:bg-blue-700 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.map((m, i) => {
              const isMe = m.senderId === user?.uid;
              return (
                <div key={m.id || i} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn("px-3 py-1.5 rounded-2xl max-w-[85%] text-sm", isMe ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-800")}>{m.text}</div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-2 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Aa"
              autoFocus
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:bg-gray-200 transition-colors"
            />
            <button onClick={sendMessage} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
              <Send className="w-5 h-5" />
            </button>
          </div>
    </div>
  );
}
