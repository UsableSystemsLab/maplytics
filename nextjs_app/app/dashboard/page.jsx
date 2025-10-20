"use client";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <h1>Welcome to your Dashboard</h1>
        </ProtectedRoute>
    );
}