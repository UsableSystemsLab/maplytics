"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confPass, setConfPass] = useState("");
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
      <h1 className="text-2xl mb-4 font-semibold">{t('registerTitle')}</h1>
      <form onSubmit={handleRegister} className="flex flex-col gap-2 w-64">
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
        <input
          type="password"
          placeholder={t('confirmPasswordPlaceholder')}
          value={confPass}
          onChange={(e) => setConfPass(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button
          disabled={loading}
          type="submit"
          className={`text-white p-2 rounded hover:bg-green-600/90 active:scale-95 transform transition-all ${
            loading ? "bg-green-900" : "bg-green-600"
          }`}
        >
          {t('registerButton')}
        </button>
      </form>

      <button
        onClick={handleGoogleRegister}
        className="mt-4 border flex items-center justify-center gap-2 p-2 rounded hover:bg-gray-100 transition-all"
      >
        <img src="/google.svg" alt={t('googleAlt')} className="w-5 h-5" />
        {t('signUpWithGoogle')}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
      <p className="mt-4 text-sm">
        {t('alreadyHaveAccount')}{" "}
        <Link href="/login" className="text-blue-600 underline">
          {t('loginLink')}
        </Link>
      </p>
    </div>
  );
}
