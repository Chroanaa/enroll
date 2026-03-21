"use client";
import React, { useState } from "react";
import { BarChart3, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { colors } from "../colors";
import ForgotPasswordModal from "./ForgotPasswordModal";

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
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const username = usernameInput.trim() || ((formData.get("username") as string) || "");
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ background: colors.paper, minHeight: "100vh" }}>
      <style>{customStyles}</style>
      <div
        className='min-h-screen flex'
        style={{
          background: `linear-gradient(135deg, ${colors.paper} 0%, #fff 50%, ${colors.paper} 100%)`,
        }}
      >
        <div
          className='hidden lg:flex lg:w-1/2 relative overflow-hidden'
          style={{ backgroundColor: colors.primary }}
        >
          <div className='absolute inset-0'>
            <Image
              src='/leftdivimage.png'
              alt='Background'
              fill
              className='object-cover'
              priority
            />
          </div>
          <div className='absolute inset-0 bg-black opacity-60'></div>=
          <div
            className='absolute inset-0'
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 10%, ${colors.primary}100 50%, ${colors.primary}F0 100%)`,
            }}
          ></div>
          <div
            className='absolute bottom-0 left-0 right-0 h-32'
            style={{
              background: `linear-gradient(to top, ${colors.primary} 0%, transparent 100%)`,
            }}
          ></div>
          <div className='relative z-10 flex flex-col justify-center items-center text-white p-12'>
            <div className='text-center max-w-md'>
              <div className='flex justify-center mb-8'>
                <div
                  className='relative w-28 h-28 flex items-center justify-center transition-all duration-300 hover:scale-110'
                  style={{
                    background: colors.paper,
                    borderRadius: "100%",
                    boxShadow: `0 0 30px ${colors.accent}60, 0 8px 32px ${colors.primary}90`,
                  }}
                >
                  <Image
                    src='/logo.png'
                    alt='CSTA Logo'
                    width={85}
                    height={85}
                    className='object-contain relative z-10'
                    priority
                  />
                </div>
              </div>
              <h1
                className='text-5xl font-bold mb-4 tracking-wide'
                style={{
                  color: colors.accent,
                  textShadow:
                    "0 4px 16px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)",
                  letterSpacing: "0.1em",
                }}
              >
                ITERESIAN
              </h1>
              <h2
                className='text-xl font-semibold mb-8 tracking-wider'
                style={{
                  color: colors.paper,
                  textShadow: "0 3px 10px rgba(0,0,0,0.5)",
                }}
              >
                COLEGIO DE STA. TERESA DE AVILA
              </h2>

              {/* Decorative divider line */}
              <div className='flex items-center justify-center mb-8'>
                <div
                  className='flex-1 border-t'
                  style={{ borderColor: colors.accent, opacity: 0.5 }}
                ></div>
                <div className='mx-4' style={{ color: colors.accent }}>
                  <svg
                    className='w-2 h-2'
                    fill='currentColor'
                    viewBox='0 0 6 6'
                  >
                    <circle cx='3' cy='3' r='3' />
                  </svg>
                </div>
                <div
                  className='flex-1 border-t'
                  style={{ borderColor: colors.accent, opacity: 0.5 }}
                ></div>
              </div>

              <p
                className='text-base leading-relaxed font-medium'
                style={{
                  color: colors.paper,
                  textShadow: "0 2px 8px rgba(0,0,0,0.4)",
                  opacity: 0.95,
                }}
              >
                A premier educational institution committed to academic
                excellence, character formation, and holistic development. Join
                our community of learners and discover your potential with us.
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
                    borderRadius: "100%",
                    border: `2px solid ${colors.accent}`,
                  }}
                >
                  <div
                    className='absolute inset-0 rounded-full'
                    style={{
                      background: `linear-gradient(135deg, ${colors.accent}15 0%, transparent 100%)`,
                    }}
                  ></div>
                  <Image
                    src='/logo.png'
                    alt='CSTA Logo'
                    width={60}
                    height={60}
                    className='object-contain relative z-10'
                    priority
                  />
                </div>
              </div>
              <h1
                className='text-3xl font-bold mb-1 tracking-wide'
                style={{ color: colors.accent }}
              >
                ITERISIAN
              </h1>
              <h2
                className='text-sm font-semibold mb-2 tracking-wider'
                style={{ color: colors.tertiary }}
              >
                COLEGIO DE STA. TERESA DE AVILA
              </h2>
              <p
                className='text-sm font-medium'
                style={{ color: colors.primary }}
              >
                Empowering Minds, Shaping Futures
              </p>
            </div>

            {/* Login Card */}
            <div
              className='rounded-2xl shadow-xl border p-8'
              style={{ background: colors.paper }}
            >
              <div className='mb-6'>
                <h2
                  className='text-2xl font-bold mb-2'
                  style={{ color: colors.primary }}
                >
                  Welcome Back
                </h2>
                <p style={{ color: colors.secondary }}>
                  Sign in to access your enrollment dashboard
                </p>
              </div>

              {/* User & Password Form */}
              <form className='space-y-4' onSubmit={handleLogin}>
                {error && (
                  <div className='p-3 bg-red-50 border border-red-200 rounded-lg'>
                    <p className='text-sm text-red-600'>{error}</p>
                  </div>
                )}
                <div>
                  <label
                    htmlFor='username'
                    className='block text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    Username:
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <Mail
                        className='h-5 w-5'
                        style={{ color: colors.tertiary }}
                      />
                    </div>
                    <input
                      id='username'
                      name='username'
                      type='text'
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className='w-full pl-10 pr-3 py-3 border rounded-lg custom-focus transition-all duration-200'
                      style={{
                        borderColor: colors.tertiary,
                        color: colors.primary,
                        background: colors.paper,
                      }}
                      placeholder='Enter your username'
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor='password'
                    className='block text-sm font-medium mb-2'
                    style={{ color: colors.primary }}
                  >
                    Password
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <Lock
                        className='h-5 w-5'
                        style={{ color: colors.tertiary }}
                      />
                    </div>
                    <input
                      id='password'
                      name='password'
                      type={showPassword ? "text" : "password"}
                      required
                      className='w-full pl-10 pr-10 py-3 border rounded-lg custom-focus transition-all duration-200'
                      style={{
                        borderColor: colors.tertiary,
                        color: colors.primary,
                        background: colors.paper,
                      }}
                      placeholder='Enter your password'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute inset-y-0 right-0 pr-3 flex items-center'
                    >
                      {showPassword ? (
                        <EyeOff
                          className='h-5 w-5'
                          style={{ color: colors.tertiary }}
                        />
                      ) : (
                        <Eye
                          className='h-5 w-5'
                          style={{ color: colors.tertiary }}
                        />
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
                    <span
                      className='ml-2 text-sm'
                      style={{ color: colors.secondary }}
                    >
                      Remember me
                    </span>
                  </label>
                  <button
                    type='button'
                    className='text-sm font-medium transition-colors duration-200'
                    style={{ color: colors.primary }}
                    onClick={() => setShowForgotPassword(true)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = colors.secondary)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = colors.primary)
                    }
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type='submit'
                  disabled={isLoading}
                  className='w-full text-white py-3 px-4 rounded-lg font-medium custom-button-focus transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  style={{ backgroundColor: colors.secondary }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.primary)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = colors.secondary)
                  }
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
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialUsername={usernameInput}
      />
    </div>
  );
};

export default Login;
