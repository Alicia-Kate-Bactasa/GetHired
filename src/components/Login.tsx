"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onLogin?: () => void;
  onBack?: () => void;
}

export default function Login({ onLogin, onBack }: Props = {}) {
  const router = useRouter();
  const handleLoginProp = onLogin ?? (() => router.push("/dashboard"));
  const handleBack = onBack ?? (() => router.push("/"));

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetId, setResetId] = useState("");
  const [newPass, setNewPass] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isAdm = identifier.trim().toLowerCase() === "admin" && password === "admin123";
      if (isAdm) {
        try {
          localStorage.setItem("gethired_auth", JSON.stringify({ role: "admin", user: "admin" }));
        } catch {}
        router.push("/admin");
      } else {
        try {
          localStorage.setItem("gethired_auth", JSON.stringify({ role: "student", user: identifier || "21100123" }));
        } catch {}
        handleLoginProp();
      }
    }, 600);
  };

  const submitOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center overflow-x-hidden text-slate-800 select-none bg-white"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
      onKeyDown={submitOnEnter}
    >

      {/* ─── Minimalist Back Arrow to Landing Page ─── */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-10 z-30">
        <button
          type="button"
          onClick={handleBack}
          title="Back to home"
          aria-label="Back to home"
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
              src="/loginPageDesign.svg"
              alt="GetHired Login Design"
              className="w-full h-auto max-h-[440px] sm:max-h-[600px] lg:max-h-[86vh] object-contain rounded-[32px] select-none pointer-events-none"
            />
          </div>
        </div>

        {/* Wizard Form Column (First on mobile: order-1, Right on desktop: order-2) */}
        <div className="w-full flex items-center justify-center lg:-translate-x-12 xl:-translate-x-16 order-1 lg:order-2">
          <div className="w-full max-w-[420px] sm:max-w-[440px]">
            {/* Heading & Subtitle */}
            <div className="mb-8">
              <h1
                className="text-[#0F172A] font-bold text-[38px] sm:text-[44px] tracking-tight leading-[1.12]"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Welcome back.
              </h1>
              <p className="mt-2.5 text-[15.5px] text-slate-500 leading-relaxed">
                Sign in to your account to continue.
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleLogin} className="space-y-5 w-full">
              {/* Username or ID number */}
              <div className="w-full">
                <label className="block text-[#0F172A] text-[14px] font-semibold mb-2">
                  Username or ID number
                </label>
                <div className="relative w-full">
                  <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="2XXXXXXX"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-[#0F172A] text-[15px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="w-full">
                <label className="block text-[#0F172A] text-[14px] font-semibold mb-2">
                  Password
                </label>
                <div className="relative w-full">
                  <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl pl-12 pr-12 py-4 text-[#0F172A] text-[15px] outline-none focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1.5 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setRemember(!remember)}
                  className="flex items-center gap-2 text-[13.5px] text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none"
                >
                  <span
                    className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                      remember
                        ? "bg-[#0066FF] border-[#0066FF] text-white"
                        : "bg-white border-slate-300 text-transparent"
                    }`}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span>Remember me</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[13.5px] font-medium text-[#0066FF] hover:text-[#0052cc] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white text-[15px] font-semibold py-4 px-6 rounded-full shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.2-8.56" />
                      </svg>
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <>
                      <span>Log in</span>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* ─── Forgot Password Modal ─── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EEF5FF] text-[#0066FF] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[19px] font-bold text-[#0F172A]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    Student Password Reset
                  </h3>
                  <p className="text-[11.5px] text-slate-400">DCISM Authentication Service</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetSuccess(false);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Default Password Formula Callout */}
            <div className="mb-5 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-[12.5px] text-blue-900 leading-relaxed">
              <div className="font-semibold text-blue-800 mb-0.5">Pre-filled Default Password Formula:</div>
              <div className="font-mono text-[12px] bg-white/80 px-2 py-1 rounded border border-blue-200/60 inline-block text-[#0066FF] font-bold mt-1">
                idnumber_firstname
              </div>
              <p className="mt-1.5 text-[11.5px] text-blue-700">
                Example: Student ID <span className="font-semibold">21100123</span> with first name <span className="font-semibold">Ishie</span> has default password <code className="font-semibold">21100123_ishie</code>.
              </p>
            </div>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <div className="text-emerald-700 font-semibold text-[13.5px] mb-1">
                  ✓ Password Successfully Changed!
                </div>
                <p className="text-emerald-600 text-[12px]">
                  Your new credentials have been saved. You can now log in to your GetHired dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSuccess(false);
                  }}
                  className="mt-3.5 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold py-2.5 rounded-full transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!resetId.trim() || !newPass.trim()) return;
                  setIdentifier(resetId.trim());
                  setPassword(newPass.trim());
                  setResetSuccess(true);
                }}
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                    Student ID or Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2XXXXXXX or ID number"
                    value={resetId}
                    onChange={(e) => setResetId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#0066FF] focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[12.5px] font-semibold text-slate-700 mb-1">
                    Create New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your new custom password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-[#0066FF] focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-[13px] font-semibold rounded-full hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#0066FF] hover:bg-[#0052cc] text-white text-[13px] font-semibold rounded-full shadow-sm hover:shadow transition-all cursor-pointer"
                  >
                    Save New Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
