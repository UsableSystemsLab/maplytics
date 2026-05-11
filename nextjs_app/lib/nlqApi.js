import api from "./apiClient";
import { auth } from "./firebase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const getNlqProjectJobs = async (projectId) => {
    try {
        const response = await api.get(`/nlq/project/${projectId}`);
        return Array.isArray(response) ? response : [];
    } catch (error) {
        console.error("Failed to fetch NLQ jobs:", error);
        return [];
    }
};

export const submitNlqJob = async (data) => {
    try {
        // data: { type, query, projectId, datasets: [] }
        return await api.post("/nlq", data);
    } catch (error) {
        console.error("Failed to submit NLQ job:", error);
        throw error;
    }
};

export const getNlqJobStatus = async (jobId) => {
    try {
        return await api.get(`/nlq/${jobId}`);
    } catch (error) {
        console.error("Failed to get NLQ job status:", error);
        throw error;
    }
};

export const getNlqJobResultUrl = async (jobId) => {
    try {
        const user = auth.currentUser;
        if (!user) return null;
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/nlq/${jobId}/result`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Failed to fetch NLQ result image:", error);
        return null;
    }
};
