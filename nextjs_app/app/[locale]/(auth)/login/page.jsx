"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import AuthLeftPanel from "@/components/AuthLeftPanel";
import { fadeIn } from "@/lib/animationStyles";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
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
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetSuccess(false);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess(true);
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
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
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const exitResetMode = () => {
    setForgotPassword(false);
    setResetSuccess(false);
    setError("");
  };

  return (
    <div className="h-screen flex bg-gray-100 relative overflow-hidden">
      <AuthLeftPanel />
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-y-auto">

        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-10 w-full max-w-md hover:shadow-[0_20px_60px_rgba(19,69,101,0.15)] transition-all duration-500 border border-gray-100 relative z-10">
          {forgotPassword ? (
            // reset password form
            <ResetPasswordForm
              email={email}
              setEmail={setEmail}
              loading={loading}
              error={error}
              resetSuccess={resetSuccess}
              onSubmit={handlePasswordReset}
              onBack={exitResetMode}
              t={t}
            />
          ) : (
            <>
              <div className="text-center mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-heading mb-2" style={fadeIn('0s')}>{t('login.welcomeBack')}</h1>
                <p className="text-body-text text-sm md:text-base" style={fadeIn('0.1s')}>{t('login.subtitle')}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
                <div className="space-y-1.5" style={fadeIn('0.2s')}>
                  <label htmlFor="email" className="text-xs md:text-sm font-semibold text-heading block">
                    {t('shared.emailLabel')}
                  </label>
                  <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus-within:border-ocean-blue hover:border-gray-300 transition-colors cursor-text">
                    <Mail className="w-4 h-4 md:w-5 md:h-5 text-body-text flex-shrink-0" />
                    <input
                      id="email"
                      type="email"
                      placeholder={t('shared.emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 text-sm md:text-base text-heading placeholder:text-gray-500 outline-none bg-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5" style={fadeIn('0.3s')}>
                  <label htmlFor="password" className="text-xs md:text-sm font-semibold text-heading block">
                    {t('shared.passwordLabel')}
                  </label>
                  <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus-within:border-ocean-blue hover:border-gray-300 transition-colors cursor-text">
                    <Lock className="w-4 h-4 md:w-5 md:h-5 text-body-text flex-shrink-0" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t('shared.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="flex-1 text-sm md:text-base text-heading placeholder:text-gray-500 outline-none bg-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="w-8 h-8 flex items-center justify-center rounded-md flex-shrink-0 text-body-text hover:text-ocean-blue hover:bg-gray-100 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs md:text-sm" style={fadeIn('0.4s')}>
                  <button
                    type="button"
                    onClick={() => { setForgotPassword(true); setError(""); }}
                    className="text-ocean-blue hover:text-primary font-semibold transition-all hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </button>
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
                      {t('login.signingIn')}
                    </span>
                  ) : (
                    t('login.signIn')
                  )}
                </button>
              </form>

              <div className="relative my-4 md:my-6" style={fadeIn('0.6s')}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs md:text-sm">
                  <span className="px-3 md:px-4 bg-white text-body-text">{t('shared.orContinueWith')}</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full border-2 border-gray-200 bg-white hover:bg-gray-50 text-heading font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
                style={fadeIn('0.7s')}
              >
                <img src="/google.svg" alt="Google" className="w-4 h-4 md:w-5 md:h-5" />
                {t('login.signInWithGoogle')}
              </button>

              <p className="mt-4 md:mt-6 text-center text-xs md:text-sm text-body-text" style={fadeIn('0.8s')}>
                {t('login.noAccount')}{" "}
                <Link
                  href="/register"
                  className="text-ocean-blue hover:text-primary font-semibold transition-colors hover:underline"
                >
                  {t('login.signUpLink')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm({ email, setEmail, loading, error, resetSuccess, onSubmit, onBack, t }) {
  if (resetSuccess) {
    return (
      <>
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-ocean-blue/10 rounded-full mb-3" style={fadeIn('0s')}>
            <Mail className="w-7 h-7 md:w-8 md:h-8 text-ocean-blue" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-heading mb-2" style={fadeIn('0s')}>{t('resetPassword.checkYourEmail')}</h1>
        </div>
        <div style={fadeIn('0.2s')}>
          <div className="bg-cyan/10 border-l-4 border-cyan p-3 md:p-4 rounded mb-6">
            <p className="text-ocean-blue text-xs md:text-sm font-medium">
              {t('resetPassword.resetLinkSent')}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="w-full bg-ocean-blue text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base rounded-lg hover:bg-primary transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            {t('resetPassword.backToSignIn')}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="text-center mb-6 md:mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-ocean-blue/10 rounded-full mb-3" style={fadeIn('0s')}>
          <Mail className="w-7 h-7 md:w-8 md:h-8 text-ocean-blue" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-heading mb-2" style={fadeIn('0s')}>{t('resetPassword.title')}</h1>
        <p className="text-body-text text-sm md:text-base" style={fadeIn('0.1s')}>
          {t('resetPassword.subtitle')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 md:space-y-5">
        <div className="space-y-1.5" style={fadeIn('0.2s')}>
          <label htmlFor="resetEmail" className="text-xs md:text-sm font-semibold text-heading block">
            {t('shared.emailLabel')}
          </label>
          <div className="flex items-center gap-2 border-2 border-gray-200 rounded-lg px-3 md:px-4 py-2.5 md:py-3 focus-within:border-ocean-blue hover:border-gray-300 transition-colors cursor-text">
            <Mail className="w-4 h-4 md:w-5 md:h-5 text-body-text flex-shrink-0" />
            <input
              id="resetEmail"
              type="email"
              placeholder={t('shared.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 text-sm md:text-base text-heading placeholder:text-gray-500 outline-none bg-transparent"
              required
            />
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
          style={fadeIn('0.3s')}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {t('resetPassword.sending')}
            </span>
          ) : (
            t('resetPassword.sendResetLink')
          )}
        </button>
      </form>

      <p className="mt-4 md:mt-6 text-center text-xs md:text-sm text-body-text" style={fadeIn('0.4s')}>
        {t('resetPassword.rememberPassword')}{" "}
        <button
          type="button"
          onClick={onBack}
          className="text-ocean-blue hover:text-primary font-semibold transition-colors hover:underline"
        >
          {t('resetPassword.backToSignIn')}
        </button>
      </p>
    </>
  );
}
