"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff, UserPlus } from "lucide-react";
import AuthLeftPanel from "@/components/AuthLeftPanel";
import { fadeIn } from "@/lib/animationStyles";

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
        setError("Passwords do not match");
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
    <div className="h-screen flex bg-gray-100 relative overflow-hidden">
      <AuthLeftPanel />
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-10 w-full max-w-md hover:shadow-[0_20px_60px_rgba(19,69,101,0.15)] transition-all duration-500 border border-gray-100 relative z-10">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-ocean-blue/10 rounded-full mb-3" style={fadeIn('0s')}>
              <UserPlus className="w-7 h-7 md:w-8 md:h-8 text-ocean-blue" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-heading mb-2" style={fadeIn('0s')}>Create Account</h1>
            <p className="text-body-text text-sm md:text-base" style={fadeIn('0.1s')}>Join us to unlock powerful spatial analysis</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 md:space-y-5">
            <div className="space-y-1.5" style={fadeIn('0.2s')}>
              <label htmlFor="email" className="text-xs md:text-sm font-semibold text-heading block">
                Email Address
              </label>
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus-within:border-ocean-blue hover:border-gray-300 transition-colors cursor-text">
                <Mail className="w-4 h-4 md:w-5 md:h-5 text-body-text flex-shrink-0" />
                <input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-sm md:text-base text-heading placeholder:text-gray-400 outline-none bg-transparent"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5" style={fadeIn('0.3s')}>
              <label htmlFor="password" className="text-xs md:text-sm font-semibold text-heading block">
                Password
              </label>
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus-within:border-ocean-blue hover:border-gray-300 transition-colors cursor-text">
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-body-text flex-shrink-0" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 text-sm md:text-base text-heading placeholder:text-gray-400 outline-none bg-transparent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 text-body-text hover:text-ocean-blue hover:bg-gray-100 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters</p>
            </div>


            <div className="space-y-1.5" style={fadeIn('0.4s')}>
              <label htmlFor="confirmPassword" className="text-xs md:text-sm font-semibold text-heading block">
                Confirm Password
              </label>
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus-within:border-ocean-blue hover:border-gray-300 transition-colors cursor-text">
                <Lock className="w-4 h-4 md:w-5 md:h-5 text-body-text flex-shrink-0" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confPass}
                  onChange={(e) => setConfPass(e.target.value)}
                  className="flex-1 text-sm md:text-base text-heading placeholder:text-gray-400 outline-none bg-transparent"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 text-body-text hover:text-ocean-blue hover:bg-gray-100 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>


            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 md:p-4 rounded">
                <p className="text-red-700 text-xs md:text-sm">{error}</p>
              </div>
            )}


            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ocean-blue text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg hover:bg-primary active:scale-95 transform transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              style={fadeIn('0.5s')}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="relative my-4 md:my-6" style={fadeIn('0.6s')}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-3 md:px-4 bg-white text-body-text">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full border-2 border-gray-200 bg-white hover:bg-gray-50 text-heading font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            style={fadeIn('0.7s')}
          >
            <img src="/google.svg" alt="Google" className="w-4 h-4 md:w-5 md:h-5" />
            Sign up with Google
          </button>


          <p className="mt-4 md:mt-6 text-center text-xs md:text-sm text-body-text" style={fadeIn('0.8s')}>
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-ocean-blue hover:text-primary font-semibold transition-colors hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
