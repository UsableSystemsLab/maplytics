"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confPass, setConfPass] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (confPass !== password) {
                setError("Password mismatch")
                return;
            }
            await createUserWithEmailAndPassword(auth, email, password);
            router.push("/");

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false)
        }
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <h1 className="text-2xl mb-4">Register</h1>
            <form onSubmit={handleRegister} className="flex flex-col gap-2 w-64">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border p-2 rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border p-2 rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confPass}
                    onChange={(e) => setConfPass(e.target.value)}
                    className="border p-2 rounded"
                    required
                />
                <button disabled={loading} type="submit" className={`text-white p-2 rounded hover:bg-green-600/90 active:scale-95 transform transition-all ${loading ? 'bg-green-900' : 'bg-green-600'}`}>
                    Register
                </button>
            </form>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            <p className="mt-4">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-blue-600 underline">Login</Link>
            </p>
        </div>
    );
}
