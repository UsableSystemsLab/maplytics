"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

export default function AuthLayout({ children }) {  
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#134565] mx-auto mb-4"></div>
          <p className="text-[#5C5C5C] font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return <>{children}</>;
}
