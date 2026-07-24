import React, { useState } from "react";
import { Bot, Send, ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/src/components/ui/Button";

interface ChatMessage {
  id: number;
  type: "user" | "bot";
  text: string;
}

export function InteractiveZaloBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, type: "bot", text: "Xin chào! Mình là ZenBot, trợ lý học tập của bạn trên Zalo. Bạn có thể tra từ, lưu từ vựng hoặc chơi game trực tiếp tại đây nhé!" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleSend = () => {
    if (hasInteracted) return;
    
    setHasInteracted(true);
    setMessages(prev => [...prev, { id: 2, type: "user", text: "new diligent" }]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: 3, 
        type: "bot", 
        text: "✅ Lopy đã thêm từ 'diligent' (siêng năng) vào bộ thẻ của bạn thành công!" 
      }]);
    }, 1500);
  };

  const handleReset = () => {
    setHasInteracted(false);
    setMessages([
      { id: 1, type: "bot", text: "Xin chào! Mình là ZenBot, trợ lý học tập của bạn trên Zalo. Bạn có thể tra từ, lưu từ vựng hoặc chơi game trực tiếp tại đây nhé!" }
    ]);
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row mt-12">
      {/* Lời giới thiệu */}
      <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center bg-emerald-50/50">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-emerald-100 text-emerald-600">
          <Bot className="w-7 h-7" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 mb-4">Trợ Lý AI Trực Tiếp Trên Zalo</h3>
        <p className="text-slate-600 font-medium text-lg mb-6 leading-relaxed">
          Không cần cài thêm app, mọi thao tác học tập, tra từ, thêm từ mới vào bộ thẻ đều có thể thực hiện siêu nhanh thông qua tin nhắn Zalo. ZenBot luôn túc trực 24/7 để phục vụ bạn!
        </p>
      </div>

      {/* Interactive UI */}
      <div className="p-8 md:w-1/2 flex items-center justify-center bg-slate-100/50 border-t md:border-t-0 md:border-l border-slate-100 min-h-[400px]">
        
        {/* Phone Mockup */}
        <div className="w-full max-w-[320px] bg-white rounded-[2rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative h-[500px]">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center p-1">
              <img src="/mascot/Lopy (16).png" alt="Bot" className="w-full h-full object-contain" />
            </div>
            <div>
              <h5 className="font-bold text-sm">ZenBot (AI)</h5>
              <p className="text-[10px] text-blue-200">Vừa mới truy cập</p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-[#e2e8f0] p-4 flex flex-col gap-3 overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300", 
                msg.type === "user" ? "bg-blue-600 text-white self-end rounded-br-none" : "bg-white text-slate-800 self-start rounded-bl-none"
              )}>
                {msg.text}
              </div>
            ))}
            
            {isTyping && (
              <div className="max-w-[85%] bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm self-start flex gap-1.5 animate-in fade-in">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-white border-t border-slate-200 p-3 flex gap-2 items-center">
            <div className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm text-slate-700 font-medium border border-slate-200">
              {hasInteracted ? "..." : "new diligent"}
            </div>
            {!hasInteracted ? (
              <Button 
                onClick={handleSend}
                className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shrink-0 shadow-md"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            ) : (
              <Button 
                onClick={handleReset}
                className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
