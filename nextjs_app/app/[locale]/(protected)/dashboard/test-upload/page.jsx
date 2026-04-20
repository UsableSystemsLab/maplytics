"use client";

import React, { useState, useEffect } from 'react';
import { uploadFile } from '@/lib/uploadApi';

export default function TestUploadPage() {
    const [project, setProject] = useState(null);
    const [file, setFile] = useState(null);
    const [name, setName] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const projStr = localStorage.getItem('current_project');
        if (projStr) {
            try {
                setProject(JSON.parse(projStr));
            } catch (e) {
                console.error("Could not parse project");
            }
        }
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!project) {
            setStatus("Error: No active project selected in localStorage");
            return;
        }
        if (!file || !name) {
            setStatus("Error: File and Name are required");
            return;
        }

        try {
            setIsLoading(true);
            setStatus("Uploading...");
            const res = await uploadFile({
                file,
                isProjectDataset: true,
                projectId: project.id,
                layerName: name,
                description: "Test upload description"
            });
            setStatus("Success! Backend responded: " + JSON.stringify(res));
        } catch (err) {
            setStatus("Upload Failed: " + (err.message || String(err)));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Test Project Upload Logic</h1>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <strong>Current Active Project: </strong>
                {project ? `${project.name} (ID: ${project.id})` : <span className="text-red-500">None</span>}
            </div>

            <form onSubmit={handleUpload} className="space-y-4 bg-white p-6 rounded-lg shadow border border-gray-200">
                <div>
                    <label className="block text-sm font-medium mb-1">Dataset Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full border p-2 rounded" 
                        placeholder="My test layer..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">File</label>
                    <input 
                        type="file" 
                        onChange={e => setFile(e.target.files[0])}
                        className="w-full border p-2 rounded" 
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading || !project}
                    className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? "Uploading..." : "Test Upload"}
                </button>
            </form>

            {status && (
                <div className={`mt-6 p-4 rounded-lg border ${status.includes('Error') || status.includes('Failed') ? 'border-red-500 bg-red-50 text-red-700' : 'border-green-500 bg-green-50 text-green-700'}`}>
                    <pre className="whitespace-pre-wrap font-mono text-sm">{status}</pre>
                </div>
            )}
        </div>
    );
}
