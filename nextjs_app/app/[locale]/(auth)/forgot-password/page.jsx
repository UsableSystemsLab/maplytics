"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mail, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import AuthMapBackground from "@/components/auth/AuthMapBackground";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const t = useTranslations("auth");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthMapBackground>
      <div className="bg-[#134565]/15 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-10 w-full max-w-md border border-[#134565]/30 transition-all duration-500 relative">
        <div className="text-center mb-6 md:mb-8">
          <div className="opacity-0 animate-[fadeIn_1s_ease-out_forwards] inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-[#134565]/20 rounded-full border border-[#134565]/30 mb-3">
            {success ? (
              <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8 text-[#A7B34F]" />
            ) : (
              <KeyRound className="w-7 h-7 md:w-8 md:h-8 text-white" />
            )}
          </div>
          <h1 className="opacity-0 animate-[fadeIn_1s_ease-out_forwards] text-2xl md:text-3xl font-bold text-white mb-2">
            {success ? t('checkYourInbox') : t('resetPassword')}
          </h1>
          <p className="opacity-0 animate-[fadeIn_1s_ease-out_0.1s_forwards] text-white/70 text-sm md:text-base">
            {success
              ? t('resetLinkSent', { email })
              : t('resetInstructions')}
          </p>
        </div>

        {success ? (
          <div className="space-y-4 md:space-y-5">
            <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards] bg-white/5 border border-[#134565]/25 rounded-lg p-4 md:p-5 text-center">
              <p className="text-white/80 text-xs md:text-sm leading-relaxed">
                {t('didntReceive')}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border-l-4 border-red-400 p-3 md:p-4 rounded backdrop-blur-sm">
                <p className="text-red-200 text-xs md:text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleResend}
              disabled={loading}
              className="opacity-0 animate-[fadeIn_1s_ease-out_0.3s_forwards] w-full border border-[#134565]/30 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t('resending')}
                </span>
              ) : (
                t('resendEmail')
              )}
            </button>

            <Link
              href="/login"
              className="opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards] w-full bg-ocean-blue text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg hover:bg-primary active:scale-95 transform transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-white/10 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 rtl:rotate-180" />
              {t('backToSignIn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
            <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards] space-y-1.5">
              <label htmlFor="email" className="text-xs md:text-sm font-semibold text-white/90 block">
                {t('emailLabel')}
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/60 group-focus-within:text-white transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder={t('emailInputPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-sm md:text-base bg-white/5 border border-[#134565]/25 rounded-lg focus:border-[#A7B34F]/60 focus:bg-white/10 focus:outline-none transition-all duration-200 text-white placeholder:text-white/40 hover:border-[#134565]/40"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border-l-4 border-red-400 p-3 md:p-4 rounded backdrop-blur-sm">
                <p className="text-red-200 text-xs md:text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="opacity-0 animate-[fadeIn_1s_ease-out_0.3s_forwards] w-full bg-ocean-blue text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg hover:bg-primary active:scale-95 transform transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-white/10"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t('sending')}
                </span>
              ) : (
                t('sendResetLink')
              )}
            </button>

            <p className="opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards] text-center text-xs md:text-sm text-white/60">
              {t('rememberPassword')}{" "}
              <Link
                href="/login"
                className="text-earthy-green hover:text-white font-semibold transition-colors hover:underline"
              >
                {t('signIn')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </AuthMapBackground>
  );
}
