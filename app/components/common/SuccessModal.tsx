"use client";
import React, { useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { colors } from "../../colors";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title = "Success",
  message,
  autoClose = false,
  autoCloseDelay = 3000,
}) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm'
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className='rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200'
        style={{
          backgroundColor: "white",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className='px-6 py-4 flex items-center justify-between border-b'
          style={{
            backgroundColor: "#D1FAE5",
            borderColor: "#A7F3D0",
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{
                backgroundColor: "#ECFDF5",
              }}
            >
              <CheckCircle2 className='w-6 h-6' style={{ color: "#059669" }} />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: "#047857" }}
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-green-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          <p className='text-base font-medium text-gray-700'>
            {message}
          </p>

          {/* Action Button */}
          <div className='flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100'>
            <button
              type='button'
              onClick={onClose}
              className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg'
              style={{ backgroundColor: "#059669" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#047857";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#059669";
              }}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

