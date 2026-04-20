"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import AuthMapBackground from "@/components/auth/AuthMapBackground";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confPass, setConfPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const provider = new GoogleAuthProvider();
  const t = useTranslations('auth');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (confPass !== password) {
        setError(t('passwordsDoNotMatch'));
        return;
      }
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      setError("");
      await signInWithPopup(auth, provider);
      router.push("/");
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
            <UserPlus className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="opacity-0 animate-[fadeIn_1s_ease-out_forwards] text-2xl md:text-3xl font-bold text-white mb-2">{t('createAccount')}</h1>
          <p className="opacity-0 animate-[fadeIn_1s_ease-out_0.1s_forwards] text-white/70 text-sm md:text-base">{t('registerSubtitle')}</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 md:space-y-5">
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

          <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.3s_forwards] space-y-1.5">
            <label htmlFor="password" className="text-xs md:text-sm font-semibold text-white/90 block">
              {t('passwordLabel')}
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/60 group-focus-within:text-white transition-colors" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-sm md:text-base bg-white/5 border border-[#134565]/25 rounded-lg focus:border-[#A7B34F]/60 focus:bg-white/10 focus:outline-none transition-all duration-200 text-white placeholder:text-white/40 hover:border-[#134565]/40"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95 transform"
              >
                {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            </div>
          </div>

          <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards] space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs md:text-sm font-semibold text-white/90 block">
              {t('confirmPasswordLabel')}
            </label>
            <div className="relative group">
              <Lock className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/60 group-focus-within:text-white transition-colors" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confPass}
                onChange={(e) => setConfPass(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-sm md:text-base bg-white/5 border border-[#134565]/25 rounded-lg focus:border-[#A7B34F]/60 focus:bg-white/10 focus:outline-none transition-all duration-200 text-white placeholder:text-white/40 hover:border-[#134565]/40"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors hover:scale-110 active:scale-95 transform"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
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
            className="opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards] w-full bg-ocean-blue text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg hover:bg-primary active:scale-95 transform transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5 border border-white/10"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {t('creatingAccount')}
              </span>
            ) : (
              t('createAccount')
            )}
          </button>
        </form>

        <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards] flex items-center gap-3 my-4 md:my-6">
          <div className="flex-1 h-px bg-[#134565]/40" />
          <span className="text-white/50 text-xs md:text-sm">{t('orContinueWith')}</span>
          <div className="flex-1 h-px bg-[#134565]/40" />
        </div>

        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="opacity-0 animate-[fadeIn_1s_ease-out_0.7s_forwards] w-full border border-[#134565]/30 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <img src="/google.svg" alt={t('googleAlt')} className="w-4 h-4 md:w-5 md:h-5" />
          {t('signUpWithGoogle')}
        </button>

        <p className="opacity-0 animate-[fadeIn_1s_ease-out_0.8s_forwards] mt-4 md:mt-6 text-center text-xs md:text-sm text-white/60">
          {t('alreadyHaveAccount')}{" "}
          <Link
            href="/login"
            className="text-earthy-green hover:text-white font-semibold transition-colors hover:underline"
          >
            {t('signIn')}
          </Link>
        </p>
      </div>
    </AuthMapBackground>
  );
}
