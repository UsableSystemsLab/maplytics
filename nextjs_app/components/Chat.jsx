"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

export default function Chat({
    greeting = "Hello! How can I help you today?",
    className = "",
}) {
    const [messages, setMessages] = useState([
        { id: 1, role: "bot", text: greeting },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const handleInput = (e) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            role: "user",
            text: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        // Fake backend response simulation
        setTimeout(() => {
            const botResponses = [
                "That's an interesting point! Tell me more.",
                "I'm just a demo bot, but I hear you.",
                "Can you clarify what you mean?",
                "I've received your message. Processing...",
                "Here's a fake response to your inquiry!",
            ];

            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

            const botMessage = {
                id: Date.now() + 1,
                role: "bot",
                text: randomResponse,
            };

            setMessages((prev) => [...prev, botMessage]);
            setIsLoading(false);
        }, 1500); // 1.5 second fake delay
    };

    return (
        <div className={`flex flex-col h-screen w-full bg-white dark:bg-gray-950 ${className}`}>
            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-gray-950/50 pt-10">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                            }`}>
                            {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div
                            className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${msg.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-sm"
                                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm"
                                }`}
                        >
                            <p className="whitespace-pre-wrap wrap-break-word">{msg.text}</p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 flex-row">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-tl-sm shadow-sm flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        disabled={isLoading}
                        rows={1}
                        className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-gray-950 rounded-2xl text-sm outline-none transition-all disabled:opacity-50 resize-none min-h-[44px] max-h-[150px] overflow-y-auto"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="w-10 h-10 mb-0.5 flex shrink-0 items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}
