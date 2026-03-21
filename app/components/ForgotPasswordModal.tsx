"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Mail, MessageSquare, User, X } from "lucide-react";
import { colors } from "../colors";

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialUsername?: string;
};

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialUsername = "",
}: ForgotPasswordModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setUsername(initialUsername);
    setContactEmail("");
    setNote("");
    setIsSubmitting(false);
    setErrorMsg("");
    setSuccessMsg("");
  }, [initialUsername, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username.trim()) {
      setErrorMsg("Username is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          contactEmail: contactEmail.trim() || null,
          note: note.trim() || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit password reset request.");
      }

      setSuccessMsg(
        result.requestId
          ? `${result.message} Request ID: ${result.requestId}.`
          : result.message || "Password reset request submitted successfully.",
      );
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to submit password reset request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div
        className='w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl'
        style={{ background: colors.paper }}
      >
        <div
          className='flex items-center justify-between px-6 py-4'
          style={{ backgroundColor: colors.primary }}
        >
          <div>
            <h3 className='text-lg font-bold text-white'>Forgot Password</h3>
            <p className='text-sm text-white/80'>
              Submit a reset request for admin processing.
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full p-1 text-white/80 transition hover:bg-white/10 hover:text-white'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4 p-6'>
          {errorMsg ? (
            <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {errorMsg}
            </div>
          ) : null}

          {successMsg ? (
            <div className='rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
              {successMsg}
            </div>
          ) : null}

          <div>
            <label
              className='mb-2 block text-sm font-medium'
              style={{ color: colors.primary }}
            >
              Username
            </label>
            <div className='relative'>
              <User
                className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2'
                style={{ color: colors.tertiary }}
              />
              <input
                type='text'
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder='Enter your username'
                className='w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none'
                style={{
                  borderColor: `${colors.tertiary}40`,
                  color: colors.primary,
                }}
              />
            </div>
          </div>

          <div>
            <label
              className='mb-2 block text-sm font-medium'
              style={{ color: colors.primary }}
            >
              Contact Email
            </label>
            <div className='relative'>
              <Mail
                className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2'
                style={{ color: colors.tertiary }}
              />
              <input
                type='email'
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder='Optional email for admin follow-up'
                className='w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none'
                style={{
                  borderColor: `${colors.tertiary}40`,
                  color: colors.primary,
                }}
              />
            </div>
          </div>

          <div>
            <label
              className='mb-2 block text-sm font-medium'
              style={{ color: colors.primary }}
            >
              Note
            </label>
            <div className='relative'>
              <MessageSquare
                className='pointer-events-none absolute left-3 top-4 h-4 w-4'
                style={{ color: colors.tertiary }}
              />
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder='Optional details that can help verify your request'
                className='w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none'
                style={{
                  borderColor: `${colors.tertiary}40`,
                  color: colors.primary,
                  resize: "none",
                }}
              />
            </div>
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100'
            >
              Close
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60'
              style={{ backgroundColor: colors.secondary }}
            >
              {isSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
