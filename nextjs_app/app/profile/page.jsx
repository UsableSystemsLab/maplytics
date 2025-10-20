"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function HomePage() {
    const { user } = useAuth();

    const handleSignOut = async () => {
        await signOut(auth);
    };

    return (
        <ProtectedRoute>
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-3xl mb-4">Welcome Home {user?.displayName ? user?.displayName : user?.email} 🎉</h1>
                <button
                    onClick={handleSignOut}
                    className="bg-red-600 text-white px-4 py-2 rounded"
                >
                    Sign Out
                </button>
            </div>
        </ProtectedRoute>
    );
}
