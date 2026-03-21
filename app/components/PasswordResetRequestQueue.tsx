"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { colors } from "../colors";

type PasswordResetRequest = {
  id: number;
  userId: number | null;
  username: string;
  contactEmail: string | null;
  note: string | null;
  status: string;
  requestedAt: string | null;
  processedAt: string | null;
  processedBy: number | null;
  resolution: string | null;
  resolutionNote: string | null;
  matchedFullName: string;
};

export default function PasswordResetRequestQueue() {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] =
    useState<PasswordResetRequest | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  const loadRequests = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/auth/password-reset-requests");
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to load password reset requests.");
      }
      setRequests(Array.isArray(result.requests) ? result.requests : []);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to load password reset requests.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openProcessModal = (request: PasswordResetRequest) => {
    setProcessingRequest(request);
    setNewPassword("");
    setConfirmPassword("");
    setResolutionNote("");
    setShowPassword(false);
    setErrorMsg(null);
  };

  const handleProcess = async (action: "reset" | "reject") => {
    if (!processingRequest) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    if (action === "reset") {
      if (!processingRequest.userId) {
        setErrorMsg("No matching account was found for this request.");
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/password-reset-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: processingRequest.id,
          action,
          password: action === "reset" ? newPassword : undefined,
          resolutionNote: resolutionNote.trim() || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to process password reset request.");
      }

      setSuccessMsg(
        result.message || "Password reset request processed successfully.",
      );
      setProcessingRequest(null);
      await loadRequests();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Failed to process password reset request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
        <div
          className='px-6 py-4 border-b flex items-center justify-between'
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <div className='flex items-center gap-2'>
            <ShieldAlert className='w-5 h-5' style={{ color: colors.primary }} />
            <div>
              <h2 className='font-bold' style={{ color: colors.primary }}>
                Forgot Password Requests
              </h2>
              <p className='text-sm text-gray-500'>
                Review and resolve password reset submissions.
              </p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium'>
              Pending: {pendingRequests.length}
            </span>
            <button
              type='button'
              onClick={loadRequests}
              disabled={isLoading}
              className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
              title='Refresh requests'
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {successMsg ? (
          <div className='mx-6 mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800'>
            <CheckCircle className='w-5 h-5 flex-shrink-0' />
            {successMsg}
          </div>
        ) : null}

        {errorMsg && !processingRequest ? (
          <div className='mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'>
            <AlertCircle className='w-5 h-5 flex-shrink-0' />
            {errorMsg}
          </div>
        ) : null}

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
            <span className='ml-2 text-gray-500'>Loading requests...</span>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className='text-center py-12 text-gray-500'>
            <KeyRound className='w-12 h-12 mx-auto mb-3 text-gray-300' />
            <p>No pending forgot-password requests.</p>
          </div>
        ) : (
          <div className='divide-y divide-gray-100'>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className='px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'
              >
                <div className='space-y-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-semibold text-gray-900'>
                      {request.username}
                    </span>
                    <span className='text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full'>
                      Request #{request.id}
                    </span>
                    {request.userId ? (
                      <span className='text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>
                        Matched account
                      </span>
                    ) : (
                      <span className='text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full'>
                        No matching account
                      </span>
                    )}
                  </div>

                  {request.matchedFullName ? (
                    <p className='text-sm text-gray-600'>{request.matchedFullName}</p>
                  ) : null}

                  {request.contactEmail ? (
                    <p className='text-sm text-gray-600 inline-flex items-center gap-2'>
                      <Mail className='w-4 h-4' />
                      {request.contactEmail}
                    </p>
                  ) : null}

                  {request.note ? (
                    <p className='text-sm text-gray-600 max-w-2xl'>
                      {request.note}
                    </p>
                  ) : null}

                  <p className='text-xs text-gray-400'>
                    Requested{" "}
                    {request.requestedAt
                      ? new Date(request.requestedAt).toLocaleString()
                      : "unknown"}
                  </p>
                </div>

                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => openProcessModal(request)}
                    className='px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors'
                    style={{ backgroundColor: colors.secondary }}
                  >
                    Process Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {processingRequest ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-lg rounded-xl bg-white shadow-2xl'>
            <div
              className='px-6 py-4 flex items-center justify-between rounded-t-xl'
              style={{ backgroundColor: colors.primary }}
            >
              <h3 className='text-white font-bold flex items-center gap-2'>
                <KeyRound className='w-4 h-4' />
                Process Forgot Password Request
              </h3>
              <button
                type='button'
                onClick={() => {
                  setProcessingRequest(null);
                  setErrorMsg(null);
                }}
                className='text-white/80 hover:text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <div className='p-6 space-y-4'>
              {errorMsg ? (
                <div className='flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800'>
                  <AlertCircle className='w-5 h-5 flex-shrink-0' />
                  {errorMsg}
                </div>
              ) : null}

              <div className='rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 space-y-1'>
                <p>
                  <strong>Username:</strong> {processingRequest.username}
                </p>
                <p>
                  <strong>Matched account:</strong>{" "}
                  {processingRequest.userId
                    ? processingRequest.matchedFullName || processingRequest.username
                    : "No matching account found"}
                </p>
                {processingRequest.contactEmail ? (
                  <p>
                    <strong>Contact email:</strong> {processingRequest.contactEmail}
                  </p>
                ) : null}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Admin Note
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  placeholder='Optional note for how this request was handled'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  style={{ resize: "none" }}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Temporary Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder='Enter a temporary password'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  disabled={!processingRequest.userId}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirm Temporary Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder='Confirm temporary password'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  disabled={!processingRequest.userId}
                />
                <label className='mt-2 inline-flex items-center gap-2 text-xs text-gray-500'>
                  <input
                    type='checkbox'
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                  />
                  Show password
                </label>
              </div>

              <div className='flex justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => {
                    setProcessingRequest(null);
                    setErrorMsg(null);
                  }}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={() => handleProcess("reject")}
                  disabled={isSubmitting}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50'
                >
                  {isSubmitting ? "Working..." : "Reject"}
                </button>
                <button
                  type='button'
                  onClick={() => handleProcess("reset")}
                  disabled={isSubmitting || !processingRequest.userId}
                  className='inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50'
                  style={{ backgroundColor: colors.secondary }}
                >
                  {isSubmitting ? <Loader2 className='w-4 h-4 animate-spin' /> : <KeyRound className='w-4 h-4' />}
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
