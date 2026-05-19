"use client";

import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useTranslations } from "next-intl";

export default function HomePage() {
    const { user } = useAuth();
    const t = useTranslations("profile");

    const handleSignOut = async () => {
        await signOut(auth);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-3xl mb-4">{t('welcome', { name: user?.displayName || user?.email || '' })}</h1>
            <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded">
                {t('signOut')}
            </button>
        </div>
    );
}
