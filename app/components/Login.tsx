"use client";
import React, { useState } from "react";
import { BarChart3, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { mockUsers } from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../colors";

// Custom styles for focus states
const customStyles = `
  .custom-focus:focus {
    outline: none;
    border-color: ${colors.primary} !important;
    box-shadow: 0 0 0 3px ${colors.primary}1A !important; // 1A is 10% opacity
  }
  .custom-button-focus:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${colors.primary}33 !important; // 20% opacity
  }
`;

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
    <div style={{ background: colors.paper, minHeight: '100vh' }}>
      <style>{customStyles}</style>
      <div className='min-h-screen flex' style={{ background: `linear-gradient(135deg, ${colors.paper} 0%, #fff 50%, ${colors.paper} 100%)` }}>
   
      <div className='hidden lg:flex lg:w-1/2 relative overflow-hidden' style={{ backgroundColor: colors.primary }}>
   
        <div className='absolute inset-0'>
          <Image 
            src="/leftdivimage.png" 
            alt="Background" 
            fill
            className="object-cover"
            priority
          />
        </div>
       
        <div className='absolute inset-0 bg-black opacity-60'></div>
=
        <div className='absolute inset-0' style={{
          background: `linear-gradient(135deg, ${colors.primary} 10%, ${colors.primary}100 50%, ${colors.primary}F0 100%)`
        }}></div>

        <div className='absolute bottom-0 left-0 right-0 h-32' style={{
          background: `linear-gradient(to top, ${colors.primary} 0%, transparent 100%)`
        }}></div>
        <div className='relative z-10 flex flex-col justify-center items-center text-white p-12'>
        
          <div className='text-center max-w-md'>
            <div className='flex justify-center mb-8'>
              <div 
                className='relative w-28 h-28 flex items-center justify-center transition-all duration-300 hover:scale-110' 
                style={{
                  background: colors.paper, 
                  borderRadius: '100%',
                  boxShadow: `0 0 30px ${colors.accent}60, 0 8px 32px ${colors.primary}90`
                }}>
                <Image 
                  src="/logo.png" 
                  alt="CSTA Logo" 
                  width={85} 
                  height={85}
                  className="object-contain relative z-10"
                
                  priority
                />
              </div>
            </div>
            <h1 className='text-5xl font-bold mb-4 tracking-wide' style={{
              color: colors.accent,
              textShadow: '0 4px 16px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)',
              letterSpacing: '0.1em'
            }}>
              ITERISIAN
            </h1>
            <h2 className='text-xl font-semibold mb-8 tracking-wider' style={{
              color: colors.paper,
              textShadow: '0 3px 10px rgba(0,0,0,0.5)'
            }}>
              COLEGIO DE STA. TERESA DE AVILA
            </h2>
            
            {/* Decorative divider line */}
            <div className='flex items-center justify-center mb-8'>
              <div className='flex-1 border-t' style={{ borderColor: colors.accent, opacity: 0.5 }}></div>
              <div className='mx-4' style={{ color: colors.accent }}>
                <svg className='w-2 h-2' fill='currentColor' viewBox='0 0 6 6'>
                  <circle cx='3' cy='3' r='3' />
                </svg>
              </div>
              <div className='flex-1 border-t' style={{ borderColor: colors.accent, opacity: 0.5 }}></div>
            </div>
          
            <p className='text-base leading-relaxed font-medium' style={{
              color: colors.paper, 
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              opacity: 0.95
            }}>
              A premier educational institution committed to academic excellence, 
              character formation, and holistic development. Join our community 
              of learners and discover your potential with us.
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className='w-full lg:w-1/2 flex items-center justify-center p-8'>
        <div className='w-full max-w-md'>
          {/* Mobile Logo and Header */}
          <div className='lg:hidden text-center mb-8'>
            <div className='flex justify-center mb-4'>
              <div 
                className='relative w-20 h-20 flex items-center justify-center' 
                style={{
                  background: `linear-gradient(135deg, ${colors.paper} 0%, ${colors.accent}10 100%)`, 
                  borderRadius: '100%',
                  border: `2px solid ${colors.accent}`
                }}>
                <div className="absolute inset-0 rounded-full" style={{
                  background: `linear-gradient(135deg, ${colors.accent}15 0%, transparent 100%)`}}></div>
                <Image 
                  src="/logo.png" 
                  alt="CSTA Logo" 
                  width={60} 
                  height={60}
                  className="object-contain relative z-10"
               
                  priority
                />
              </div>
            </div>
            <h1 className='text-3xl font-bold mb-1 tracking-wide' style={{color: colors.accent}}>ITERISIAN</h1>
            <h2 className='text-sm font-semibold mb-2 tracking-wider' style={{color: colors.tertiary}}>COLEGIO DE STA. TERESA DE AVILA</h2>
            <p className='text-sm font-medium' style={{color: colors.primary}}>Empowering Minds, Shaping Futures</p>
          </div>

          {/* Login Card */}
          <div className='rounded-2xl shadow-xl border p-8' style={{ background: colors.paper }}>
            <div className='mb-6'>
              <h2 className='text-2xl font-bold mb-2' style={{ color: colors.primary }}>
                Welcome Back
              </h2>
              <p style={{color: colors.secondary}}>
                Sign in to access your enrollment dashboard
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
                <label htmlFor='email' className='block text-sm font-medium mb-2' style={{color: colors.primary}}>
                  Email Address
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Mail className='h-5 w-5' style={{color: colors.tertiary}} />
                  </div>
                  <input
                    id='username'
                    name='username'
                    type='text'
                    required
                    className='w-full pl-10 pr-3 py-3 border rounded-lg custom-focus transition-all duration-200'
                    style={{borderColor: colors.tertiary, color: colors.primary, background: colors.paper}}
                    placeholder='Enter your email'
                  />
                </div>
              </div>
              <div>
                <label htmlFor='password' className='block text-sm font-medium mb-2' style={{color: colors.primary}}>
                  Password
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <Lock className='h-5 w-5' style={{color: colors.tertiary}} />
                  </div>
                  <input
                    id='password'
                    name='password'
                    type={showPassword ? "text" : "password"}
                    required
                    className='w-full pl-10 pr-10 py-3 border rounded-lg custom-focus transition-all duration-200'
                    style={{borderColor: colors.tertiary, color: colors.primary, background: colors.paper}}
                    placeholder='Enter your password'
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  >
                    {showPassword ? (
                      <EyeOff className='h-5 w-5' style={{color: colors.tertiary}} />
                    ) : (
                      <Eye className='h-5 w-5' style={{color: colors.tertiary}} />
                    )}
                  </button>
                </div>
              </div>

              <div className='flex items-center justify-between'>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    className='h-4 w-4 border rounded'
                    style={{ accentColor: colors.primary }}
                  />
                  <span className='ml-2 text-sm' style={{color: colors.secondary}}>
                    Remember me
                  </span>
                </label>
                <button
                  type='button'
                  className='text-sm font-medium transition-colors duration-200'
                  style={{ color: colors.primary }}
                  onMouseEnter={(e) => e.currentTarget.style.color = colors.secondary}
                  onMouseLeave={(e) => e.currentTarget.style.color = colors.primary}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type='submit'
                disabled={isLoading}
                className='w-full text-white py-3 px-4 rounded-lg font-medium custom-button-focus transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                style={{ backgroundColor: colors.secondary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.secondary}
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

            {/* Divider */}
            <div className='my-6'>
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t' style={{borderColor: colors.tertiary}} />
                </div>
                <div className='relative flex justify-center text-sm'>
                  <span className='px-2' style={{background: colors.paper, color: colors.tertiary}}>
                    Or continue with
                  </span>
                </div>
              </div>
            </div>

            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className='w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              style={{
                background: colors.paper,
                border: `2px solid ${colors.tertiary}`,
                color: colors.primary
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = colors.secondary;
                e.currentTarget.style.backgroundColor = colors.accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = colors.tertiary;
                e.currentTarget.style.backgroundColor = colors.paper;
              }}
            >
              {isLoading ? (
                <div className='w-5 h-5 border-2 border-gray-300 rounded-full animate-spin' style={{ borderTopColor: colors.primary }} />
              ) : (
                <>
                  <svg className='w-5 h-5' viewBox='0 0 24 24'>
                    <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/>
                    <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/>
                    <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'/>
                    <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
