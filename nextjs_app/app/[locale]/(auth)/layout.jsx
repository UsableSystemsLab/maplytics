"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { useTranslations } from "next-intl";
import { auth } from "@/lib/firebase";

export default function AuthLayout({ children }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const t = useTranslations("header");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-ocean-blue mx-auto mb-4"></div>
          <p className="text-body-text font-semibold">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
