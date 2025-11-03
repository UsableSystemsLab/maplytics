"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const provider = new GoogleAuthProvider();
  const t = useTranslations('auth');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
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
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl mb-4 font-semibold">{t('loginTitle')}</h1>
      <form onSubmit={handleLogin} className="flex flex-col gap-2 w-64">
        <input
          type="email"
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder={t('passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className={`text-white p-2 rounded hover:bg-cyan-700/90 active:scale-95 transform transition-all ${loading ? "bg-cyan-900" : "bg-cyan-700"
            }`}
        >
          {t('signIn')}
        </button>
      </form>

      <button
        onClick={handleGoogleLogin}
        className="mt-4 border flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-100 transition-all"
      >
        <img src="/google.svg" alt={t('googleAlt')} className="w-5 h-5" />
        {t('signInWithGoogle')}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      <p className="mt-4 text-sm">
        {t('noAccount')}{" "}
        <Link href="/register" className="text-blue-600 underline">
          {t('registerLink')}
        </Link>
      </p>
    </div>
  );
}
