import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  desc?: string;
  className?: string;
  hideCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, children, title, desc, className, hideCloseButton = false }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className={cn("relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden", className)}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-slate-800">{title}</h2>
              {desc && <p className="text-sm text-slate-500">{desc}</p>}
            </div>
            {!hideCloseButton && (
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        {!title && !hideCloseButton && (
          <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors bg-white/50 backdrop-blur-sm">
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
