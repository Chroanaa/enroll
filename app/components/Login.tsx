"use client";
import React, { useState } from "react";
import { BarChart3, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Image from "next/image";

const Login: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.target as HTMLFormElement);
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.user);
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#3A2313]-to-br from-blue-50 via-white to-purple-50 flex'>
      {/* Left Section */}
      <div className='hidden lg:flex lg:w-1/2 bg-[#3A2313] relative overflow-hidden'>
        <div className='absolute inset-0 bg-black opacity-20'> </div>
        <div className='relative z-10 flex flex-col justify-center items-center text-white p-12'>
          {/* Background Pattern */}
          <div className='absolute inset-0 opacity-10'>
            <div className='absolute top-20 left-20 w-32 h-32 bg-white rounded-full'></div>
            <div className='absolute top-40 right-32 w-24 h-24 bg-white rounded-full'></div>
            <div className='absolute bottom-32 left-32 w-40 h-40 bg-white rounded-full'></div>
            <div className='absolute bottom-20 right-20 w-28 h-28 bg-white rounded-full'></div>
          </div>

          {/* Content */}
          <div className='text-center max-w-md'>
            <div className='flex justify-center mb-6'>
              <div className='w-20 h-20 bg-white bg-opacity-50 rounded-2xl flex items-center justify-center backdrop-blur-lg'>
                <img
                  src='/logo.png'
                  alt='Iterisian Logo'
                  width={40}
                  height={40}
                  className='object-contain'
                />
              </div>
            </div>
            <h1 className='text-4xl font-bold mb-4'>Iterisian</h1>
            <p className='text-xl text-blue-100 mb-6'>Enrollment System</p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className='w-full lg:w-1/2 flex items-center justify-center p-8'>
        <div className='w-full max-w-md'>
          {/* Mobile Logo and Header */}
          <div className='lg:hidden text-center mb-8'>
            <div className='flex justify-center mb-4'>
              <div className='w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg'></div>
            </div>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Iterisian</h1>
            <p className='text-gray-600'>Enrollment System</p>
          </div>

          {/* Login Card */}
          <div className='bg-white rounded-2xl shadow-xl border border-gray-100 p-8'>
            <div className='mb-6'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>
                Welcome Back
              </h2>
              <p className='text-gray-600'>
                Sign in to access your enrollment system
              </p>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailLogin} className='space-y-4'>
              {error && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
                  <p className='text-sm text-red-600'>{error}</p>
                </div>
              )}
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Username
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Mail className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    id='username'
                    name='username'
                    type='text'
                    required
                    className='w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder:text-gray-400'
                    placeholder='Enter your username'
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor='password'
                  className='block text-sm font-medium text-gray-700 mb-2'
                >
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Lock className='h-5 w-5 text-gray-400' />
                  </div>
                  <input
                    id='password'
                    name='password'
                    type={showPassword ? "text" : "password"}
                    required
                    className='w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder:text-gray-400'
                    placeholder='Enter your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  >
                    {showPassword ? (
                      <EyeOff className='h-5 w-5 text-gray-400 hover:text-gray-600' />
                    ) : (
                      <Eye className='h-5 w-5 text-gray-400 hover:text-gray-600' />
                    )}
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                  />
                  <span className='ml-2 text-sm text-gray-600'>
                    Remember me
                  </span>
                </label>
                <button
                  type='button'
                  className='text-sm text-blue-600 hover:text-blue-500 font-medium'
                >
                  Forgot password?
                </button>
              </div>

              <button
                type='submit'
                disabled={isLoading}
                className='w-full bg-[#955A27] text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? (
                  <div className='flex items-center justify-center gap-2'>
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
