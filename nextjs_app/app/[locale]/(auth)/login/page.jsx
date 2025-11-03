"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import AuthLeftPanel from "@/components/AuthLeftPanel";
import { fadeIn } from "@/lib/animationStyles";

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
    <div className="h-screen flex bg-[#F5F5F5] relative overflow-hidden">
      <AuthLeftPanel />
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">

        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-10 w-full max-w-md hover:shadow-[0_20px_60px_rgba(19,69,101,0.15)] transition-all duration-500 border border-gray-100 relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#333333] mb-2" style={fadeIn('0s')}>Welcome Back</h1>
            <p className="text-[#5C5C5C] text-sm md:text-base" style={fadeIn('0.1s')}>Sign in to analyze and visualize spatial data effortlessly</p>
          </div>


          <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
            <div className="space-y-1.5" style={fadeIn('0.2s')}>
              <label htmlFor="email" className="text-xs md:text-sm font-semibold text-[#333333] block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#5C5C5C] group-focus-within:text-[#134565] transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-lg focus:border-[#134565] focus:outline-none transition-all duration-200 text-[#333333] placeholder:text-gray-400 hover:border-gray-300"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5" style={fadeIn('0.3s')}>
              <label htmlFor="password" className="text-xs md:text-sm font-semibold text-[#333333] block">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#5C5C5C] group-focus-within:text-[#134565] transition-colors" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-lg focus:border-[#134565] focus:outline-none transition-all duration-200 text-[#333333] placeholder:text-gray-400 hover:border-gray-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-[#5C5C5C] hover:text-[#134565] transition-colors hover:scale-110 active:scale-95 transform"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs md:text-sm" style={fadeIn('0.4s')}>
              <Link
                href="/forgot-password"
                className="text-[#134565] hover:text-[#0E3147] font-semibold transition-all hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 md:p-4 rounded">
                <p className="text-red-700 text-xs md:text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#134565] text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg hover:bg-[#0E3147] active:scale-95 transform transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={fadeIn('0.5s')}
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

          <div className="relative my-4 md:my-6" style={fadeIn('0.6s')}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-3 md:px-4 bg-white text-[#5C5C5C]">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full border-2 border-gray-200 bg-white hover:bg-gray-50 text-[#333333] font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            style={fadeIn('0.7s')}
          >
            <img src="/google.svg" alt="Google" className="w-4 h-4 md:w-5 md:h-5" />
            Sign in with Google
          </button>

          <p className="mt-4 md:mt-6 text-center text-xs md:text-sm text-[#5C5C5C]" style={fadeIn('0.8s')}>
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-[#134565] hover:text-[#0E3147] font-semibold transition-colors hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
