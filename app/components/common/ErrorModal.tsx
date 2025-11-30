"use client";
import React from "react";
import { X, AlertCircle } from "lucide-react";
import { colors } from "../../colors";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = "Error",
  message,
  details,
}) => {
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
            backgroundColor: "#FEE2E2",
            borderColor: "#FCA5A5",
          }}
        >
          <div className='flex items-center gap-3'>
            <div
              className='p-2 rounded-lg'
              style={{
                backgroundColor: "#FEF2F2",
              }}
            >
              <AlertCircle className='w-6 h-6' style={{ color: "#DC2626" }} />
            </div>
            <div>
              <h2
                className='text-xl font-bold'
                style={{ color: "#991B1B" }}
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-2 rounded-full hover:bg-red-100 transition-colors text-gray-400 hover:text-gray-600'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='p-6'>
          <p className='text-base font-medium text-gray-700 mb-2'>
            {message}
          </p>
          {details && (
            <p className='text-sm text-gray-500 mt-2'>
              {details}
            </p>
          )}

          {/* Action Button */}
          <div className='flex justify-end gap-3 pt-4 mt-4 border-t border-gray-100'>
            <button
              type='button'
              onClick={onClose}
              className='px-6 py-2.5 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg'
              style={{ backgroundColor: "#DC2626" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#B91C1C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#DC2626";
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

export default ErrorModal;

