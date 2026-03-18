"use client";
import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Users,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Pencil,
  Trash2,
  KeyRound,
  X,
} from "lucide-react";
import { colors } from "../colors";
import { useSession } from "next-auth/react";

interface UserAccount {
  id: number;
  username: string;
  role: number;
  roles: { role: string | null };
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}

interface RoleOption {
  id: number;
  role: string | null;
}

export default function AccountManagement() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<number | "">("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState<number | "">("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  // Reset password state
  const [resetPasswordUser, setResetPasswordUser] =
    useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Delete state
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/accounts");
      if (!res.ok) throw new Error("Failed to fetch accounts");
      const data = await res.json();
      setUsers(data.users || []);
      setRoles(data.roles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setSelectedRole("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setShowPassword(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username || !password || !selectedRole) {
      setErrorMsg("All fields are required.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role: selectedRole,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create account.");
        return;
      }

      setSuccessMsg(`Account "${username}" created successfully!`);
      resetForm();
      setShowCreateForm(false);
      fetchAccounts();

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeColor = (roleId: number) => {
    switch (roleId) {
      case 1:
        return "bg-purple-100 text-purple-800";
      case 2:
        return "bg-green-100 text-green-800";
      case 3:
        return "bg-blue-100 text-blue-800";
      case 4:
        return "bg-orange-100 text-orange-800";
      case 5:
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentUserId = (session?.user as any)?.id;

  // Edit handlers
  const openEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditFirstName(user.first_name || "");
    setEditMiddleName(user.middle_name || "");
    setEditLastName(user.last_name || "");
    setErrorMsg(null);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    setErrorMsg(null);

    if (!editUsername || editUsername.length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return;
    }
    if (!editRole) {
      setErrorMsg("Role is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          username: editUsername,
          role: editRole,
          first_name: editFirstName,
          middle_name: editMiddleName,
          last_name: editLastName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update account.");
        return;
      }
      setSuccessMsg(`Account "${editUsername}" updated successfully!`);
      setEditingUser(null);
      fetchAccounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset password handlers
  const openResetPassword = (user: UserAccount) => {
    setResetPasswordUser(user);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setErrorMsg(null);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resetPasswordUser.id,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to reset password.");
        return;
      }
      setSuccessMsg(
        `Password for "${resetPasswordUser.username}" reset successfully!`,
      );
      setResetPasswordUser(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deletingUser) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingUser.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to delete account.");
        setDeletingUser(null);
        return;
      }
      setSuccessMsg(`Account "${deletingUser.username}" deleted successfully!`);
      setDeletingUser(null);
      fetchAccounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='p-6 max-w-5xl mx-auto space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Shield className='w-7 h-7' style={{ color: colors.primary }} />
          <div>
            <h1
              className='text-2xl font-bold'
              style={{ color: colors.primary }}
            >
              Account Management
            </h1>
            <p className='text-sm text-gray-500'>
              Create and manage user accounts
            </p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={fetchAccounts}
            disabled={isLoading}
            className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
            title='Refresh'
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-500 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              if (!showCreateForm) resetForm();
            }}
            className='px-4 py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors flex items-center gap-2'
            style={{ backgroundColor: colors.secondary }}
          >
            <UserPlus className='w-4 h-4' />
            {showCreateForm ? "Cancel" : "Create Account"}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMsg && (
        <div className='flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800'>
          <CheckCircle className='w-5 h-5 flex-shrink-0' />
          {successMsg}
        </div>
      )}

      {/* Create Account Form */}
      {showCreateForm && (
        <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
          <div
            className='px-6 py-4 border-b'
            style={{
              backgroundColor: `${colors.primary}08`,
              borderColor: `${colors.primary}15`,
            }}
          >
            <h2 className='font-bold' style={{ color: colors.primary }}>
              Create New Account
            </h2>
          </div>
          <form onSubmit={handleSubmit} className='p-6 space-y-4'>
            {errorMsg && (
              <div className='flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800'>
                <AlertCircle className='w-5 h-5 flex-shrink-0' />
                {errorMsg}
              </div>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Username
                </label>
                <input
                  type='text'
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder='Enter username'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  minLength={3}
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(
                      e.target.value ? parseInt(e.target.value) : "",
                    )
                  }
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  required
                >
                  <option value=''>Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role || `Role ${r.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  First Name
                </label>
                <input
                  type='text'
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder='First name'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Middle Name
                </label>
                <input
                  type='text'
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder='Middle name'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Last Name
                </label>
                <input
                  type='text'
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder='Last name'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Password
                </label>
                <div className='relative'>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='Enter password'
                    className='w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                    minLength={6}
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder='Confirm password'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  minLength={6}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className='text-xs text-red-500 mt-1'>
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <div className='flex justify-end pt-2'>
              <button
                type='submit'
                disabled={isSubmitting}
                className='px-6 py-2.5 rounded-lg text-white font-medium text-sm hover:opacity-90 transition-colors flex items-center gap-2 disabled:opacity-50'
                style={{ backgroundColor: colors.secondary }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className='w-4 h-4' />
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Accounts Table */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden'>
        <div
          className='px-6 py-4 border-b flex items-center gap-2'
          style={{
            backgroundColor: `${colors.primary}08`,
            borderColor: `${colors.primary}15`,
          }}
        >
          <Users className='w-5 h-5' style={{ color: colors.primary }} />
          <h2 className='font-bold' style={{ color: colors.primary }}>
            Existing Accounts
          </h2>
          <span className='text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full'>
            {users.length}
          </span>
        </div>

        {isLoading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-gray-400' />
            <span className='ml-2 text-gray-500'>Loading accounts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className='text-center py-12 text-gray-500'>
            <Users className='w-12 h-12 mx-auto mb-3 text-gray-300' />
            <p>No accounts found.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='bg-gray-50 border-b border-gray-200'>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    ID
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Username
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Full Name
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Role
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className='hover:bg-gray-50 transition-colors'
                  >
                    <td className='px-6 py-3.5 text-sm text-gray-500 font-mono'>
                      {user.id}
                    </td>
                    <td className='px-6 py-3.5 text-sm font-medium text-gray-900'>
                      {user.username}
                    </td>
                    <td className='px-6 py-3.5 text-sm text-gray-700'>
                      {[user.first_name, user.middle_name, user.last_name]
                        .filter(Boolean)
                        .join(" ") || (
                        <span className='text-gray-400 italic'>—</span>
                      )}
                    </td>
                    <td className='px-6 py-3.5'>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.roles?.role || `Role ${user.role}`}
                      </span>
                    </td>
                    <td className='px-6 py-3.5 text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <button
                          onClick={() => openEdit(user)}
                          className='p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors'
                          title='Edit account'
                        >
                          <Pencil className='w-4 h-4' />
                        </button>
                        <button
                          onClick={() => openResetPassword(user)}
                          className='p-1.5 rounded-md hover:bg-amber-50 text-amber-600 transition-colors'
                          title='Reset password'
                        >
                          <KeyRound className='w-4 h-4' />
                        </button>
                        {String(user.id) !== String(currentUserId) && (
                          <button
                            onClick={() => setDeletingUser(user)}
                            className='p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors'
                            title='Delete account'
                          >
                            <Trash2 className='w-4 h-4' />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Account Modal */}
      {editingUser && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-xl shadow-2xl w-full max-w-md'>
            <div
              className='px-6 py-4 flex items-center justify-between rounded-t-xl'
              style={{ backgroundColor: colors.primary }}
            >
              <h3 className='text-white font-bold flex items-center gap-2'>
                <Pencil className='w-4 h-4' />
                Edit Account
              </h3>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setErrorMsg(null);
                }}
                className='text-white/80 hover:text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              {errorMsg && (
                <div className='flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800'>
                  <AlertCircle className='w-5 h-5 flex-shrink-0' />
                  {errorMsg}
                </div>
              )}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Username
                </label>
                <input
                  type='text'
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  minLength={3}
                />
              </div>
              <div className='grid grid-cols-3 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    First Name
                  </label>
                  <input
                    type='text'
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder='First name'
                    className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Middle Name
                  </label>
                  <input
                    type='text'
                    value={editMiddleName}
                    onChange={(e) => setEditMiddleName(e.target.value)}
                    placeholder='Middle name'
                    className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Last Name
                  </label>
                  <input
                    type='text'
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder='Last name'
                    className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value ? parseInt(e.target.value) : "")
                  }
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                >
                  <option value=''>Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role || `Role ${r.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex justify-end gap-3 pt-2'>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setErrorMsg(null);
                  }}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2'
                  style={{ backgroundColor: colors.secondary }}
                >
                  {isSubmitting ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Pencil className='w-4 h-4' />
                  )}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-xl shadow-2xl w-full max-w-md'>
            <div
              className='px-6 py-4 flex items-center justify-between rounded-t-xl'
              style={{ backgroundColor: colors.primary }}
            >
              <h3 className='text-white font-bold flex items-center gap-2'>
                <KeyRound className='w-4 h-4' />
                Reset Password — {resetPasswordUser.username}
              </h3>
              <button
                onClick={() => {
                  setResetPasswordUser(null);
                  setErrorMsg(null);
                }}
                className='text-white/80 hover:text-white'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
            <div className='p-6 space-y-4'>
              {errorMsg && (
                <div className='flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800'>
                  <AlertCircle className='w-5 h-5 flex-shrink-0' />
                  {errorMsg}
                </div>
              )}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  New Password
                </label>
                <div className='relative'>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder='Enter new password'
                    className='w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                    minLength={6}
                  />
                  <button
                    type='button'
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showNewPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Confirm New Password
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder='Confirm new password'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm'
                  minLength={6}
                />
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className='text-xs text-red-500 mt-1'>
                    Passwords do not match
                  </p>
                )}
              </div>
              <div className='flex justify-end gap-3 pt-2'>
                <button
                  onClick={() => {
                    setResetPasswordUser(null);
                    setErrorMsg(null);
                  }}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={isSubmitting}
                  className='px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2'
                  style={{ backgroundColor: colors.secondary }}
                >
                  {isSubmitting ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <KeyRound className='w-4 h-4' />
                  )}
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='bg-white rounded-xl shadow-2xl w-full max-w-sm'>
            <div className='p-6 text-center space-y-4'>
              <div className='w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto'>
                <Trash2 className='w-6 h-6 text-red-600' />
              </div>
              <div>
                <h3 className='text-lg font-bold text-gray-900'>
                  Delete Account
                </h3>
                <p className='text-sm text-gray-500 mt-1'>
                  Are you sure you want to delete the account{" "}
                  <span className='font-semibold text-gray-700'>
                    "{deletingUser.username}"
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
              {errorMsg && (
                <div className='flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 text-left'>
                  <AlertCircle className='w-5 h-5 flex-shrink-0' />
                  {errorMsg}
                </div>
              )}
              <div className='flex justify-center gap-3 pt-2'>
                <button
                  onClick={() => {
                    setDeletingUser(null);
                    setErrorMsg(null);
                  }}
                  className='px-5 py-2 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors'
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className='px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2'
                >
                  {isSubmitting ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Trash2 className='w-4 h-4' />
                  )}
                  {isSubmitting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
