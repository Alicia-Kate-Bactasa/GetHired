"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  onSignup?: () => void;
  onBack?: () => void;
}

export default function Signup({ onSignup, onBack }: Props = {}) {
  const router = useRouter();
  const handleSignupProp = onSignup ?? (() => router.push("/login"));
  const handleBack = onBack ?? (() => router.push("/login"));

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (!email.endsWith("@usc.edu.ph")) {
      setError("Only official @usc.edu.ph emails are allowed.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/\d/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Password must contain at least one special character.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      setLoading(false);
      try {
        // Extract ID from email (e.g. 21100123@usc.edu.ph -> 21100123)
        const extractedId = email.split("@")[0];
        localStorage.setItem("gethired_auth", JSON.stringify({ role: "student", user: extractedId }));
      } catch {}
      handleSignupProp();
    }, 800);
  };

  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSignup(e as any);
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center overflow-x-hidden text-slate-800 select-none bg-white"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
      onKeyDown={submitOnEnter}
    >
      {/* ─── Minimalist Back Arrow to Login/Landing ─── */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-30">
        <button
          type="button"
          onClick={handleBack}
          title="Back"
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 text-slate-600 hover:text-[#0066FF] shadow-xs hover:shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95 group"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* ─── Two Independent Columns: Left Picture & Right Form ─── */}
      <main className="relative z-10 w-full min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center px-6 sm:px-12 lg:px-16 xl:px-24 pt-24 pb-12 sm:py-14 lg:py-0 gap-12 lg:gap-0">
        
        {/* Picture Column (Bottom on mobile: order-2, Left on desktop: order-1) */}
        <div className="w-full flex items-center justify-center lg:justify-start order-2 lg:order-1">
          <div className="relative w-full max-w-[420px] sm:max-w-[540px] lg:max-w-[620px] flex items-center justify-center lg:justify-start lg:translate-x-7 xl:translate-x-8">
            <img
              src="/loginPageDesign.png"
              alt="GetHired Signup Design"
              className="w-full h-auto max-h-[440px] sm:max-h-[600px] lg:max-h-[86vh] object-contain rounded-[32px] select-none pointer-events-none"
            />
          </div>
        </div>

        {/* Form Column (First on mobile: order-1, Right on desktop: order-2) */}
        <div className="w-full flex items-center justify-center lg:-translate-x-12 xl:-translate-x-16 order-1 lg:order-2">
          <div className="w-full max-w-[420px] sm:max-w-[440px] mt-8 lg:mt-0">
            {/* Heading & Subtitle */}
            <div className="mb-6">
              <h1
                className="text-[#0F172A] font-bold text-[38px] sm:text-[44px] tracking-tight leading-[1.12]"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Create Account.
              </h1>
              <p className="mt-2.5 text-[15.5px] text-slate-500 leading-relaxed">
                Join the GetHired community today.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-[13px] font-medium border border-red-100 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSignup} className="space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div className="w-full">
                  <label className="block text-[#0F172A] text-[13px] font-semibold mb-1.5">
                    First Name
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-full pl-10 pr-4 py-3.5 text-[#0F172A] text-[14px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div className="w-full">
                  <label className="block text-[#0F172A] text-[13px] font-semibold mb-1.5">
                    Last Name
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Doe"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-full pl-10 pr-4 py-3.5 text-[#0F172A] text-[14px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="w-full">
                <label className="block text-[#0F172A] text-[13px] font-semibold mb-1.5">
                  USC Email
                </label>
                <div className="relative w-full">
                  <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="2XXXXXXX@usc.edu.ph"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-full pl-12 pr-5 py-3.5 text-[#0F172A] text-[14px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="w-full">
                <label className="block text-[#0F172A] text-[13px] font-semibold mb-1.5">
                  Password
                </label>
                <div className="relative w-full">
                  <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-full pl-12 pr-12 py-3.5 text-[#0F172A] text-[14px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="w-full">
                <label className="block text-[#0F172A] text-[13px] font-semibold mb-1.5">
                  Confirm Password
                </label>
                <div className="relative w-full">
                  <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-full pl-12 pr-12 py-3.5 text-[#0F172A] text-[14px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white text-[15px] font-semibold py-4 px-6 rounded-full shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.2-8.56" />
                      </svg>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              {/* Login Link */}
              <div className="text-center pt-2">
                <p className="text-[13.5px] text-slate-500">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-[#0066FF] hover:text-[#0052cc] hover:underline transition-colors">
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
