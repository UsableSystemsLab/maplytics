"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const placeholderText =
    "I want an analyitcal visualized study of the top 5 most congested areas in the city with a heatmap for visualization";

export default function PromptForm() {
    const [placeholder, setPlaceholder] = useState("");

    useEffect(() => {
        let i = 0;
        const interval = setInterval(() => {
            setPlaceholder(placeholderText.slice(0, i));
            i++;

            if (i > placeholderText.length) clearInterval(interval);
        }, 10);

        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e) => {
        // Add logic later
    };

    return (
        <div className="w-full">
            <div className="space-y-6">
                <label htmlFor="prompt" className="block text-lg font-semibold text-gray-900">
                    Prompt:
                </label>

                <textarea
                    id="prompt"
                    name="prompt"
                    rows="4"
                    className="w-full px-4 py-3 text-gray-700 bg-white border-2 border-cyan rounded-2xl focus:outline-none focus:border-teal-600 resize-none"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}
