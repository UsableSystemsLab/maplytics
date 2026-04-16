"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import AuthMapBackground from "@/components/auth/AuthMapBackground";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const provider = new GoogleAuthProvider();
  const t = useTranslations('auth');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
          <h1 className="opacity-0 animate-[fadeIn_1s_ease-out_forwards] text-2xl md:text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="opacity-0 animate-[fadeIn_1s_ease-out_0.1s_forwards] text-white/70 text-sm md:text-base">Sign in to analyze and visualize spatial data effortlessly</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
          <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards] space-y-1.5">
            <label htmlFor="email" className="text-xs md:text-sm font-semibold text-white/90 block">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/60 group-focus-within:text-white transition-colors" />
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-sm md:text-base bg-white/5 border border-[#134565]/25 rounded-lg focus:border-[#A7B34F]/60 focus:bg-white/10 focus:outline-none transition-all duration-200 text-white placeholder:text-white/40 hover:border-[#134565]/40"
                required
              />
            </div>
          </div>
          <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.3s_forwards] space-y-1.5">
            <label htmlFor="password" className="text-xs md:text-sm font-semibold text-white/90 block">
              Password
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

          <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards] flex items-center justify-between text-xs md:text-sm">
            <Link
              href="/forgot-password"
              className="text-earthy-green hover:text-white font-semibold transition-all hover:underline"
            >
              Forgot Password?
            </Link>
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
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards] flex items-center gap-3 my-4 md:my-6">
          <div className="flex-1 h-px bg-[#134565]/40" />
          <span className="text-white/50 text-xs md:text-sm">Or continue with</span>
          <div className="flex-1 h-px bg-[#134565]/40" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="opacity-0 animate-[fadeIn_1s_ease-out_0.7s_forwards] w-full border border-[#134565]/30 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <img src="/google.svg" alt="Google" className="w-4 h-4 md:w-5 md:h-5" />
          Sign in with Google
        </button>

        <p className="opacity-0 animate-[fadeIn_1s_ease-out_0.8s_forwards] mt-4 md:mt-6 text-center text-xs md:text-sm text-white/60">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="text-earthy-green hover:text-white font-semibold transition-colors hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </AuthMapBackground>
  );
}
