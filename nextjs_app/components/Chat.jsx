"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Send, Bot, User, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { selectSelectedLayer } from "@/lib/store/features/layerSlice";
import {
    selectChatMessages,
    selectChatIsLoading,
    appendChatMessage,
    resetChat,
    setChatLoading,
} from "@/lib/store/features/chatSlice";
import { askLLM } from "@/lib/llmApi";
import MarkdownText from "@/components/MarkdownText";

export default function Chat({ className = "" }) {
    const dispatch = useDispatch();
    const selectedLayer = useSelector(selectSelectedLayer);
    const messages = useSelector(selectChatMessages);
    const isLoading = useSelector(selectChatIsLoading);

    const [input, setInput] = useState("");
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

    const formatBotText = (result) => {
        if (!result) return "No response from the server.";
        if (result.status === "rejected") {
            return `I can't answer that (${result.stage}): ${result.reason || "no reason provided"}`;
        }
        const verification = result.verification || {};
        const lines = [result.answer || "(empty answer)"];
        if (result.status === "unverified") {
            const issues = verification.issues ? ` — ${verification.issues}` : "";
            lines.push(`\n\n⚠ Verification flagged this answer as not fully grounded${issues}.`);
        }
        return lines.join("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const projectId = selectedLayer?.projectId ?? null;
        const datasetId = selectedLayer?.datasetId;
        const query = input.trim();

        dispatch(appendChatMessage({ id: Date.now(), role: "user", text: query }));
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        if (!datasetId) {
            dispatch(appendChatMessage({
                id: Date.now() + 1,
                role: "bot",
                text: "Please open the Layers Browser and select a dataset before asking a question.",
            }));
            return;
        }

        dispatch(setChatLoading(true));
        try {
            const result = await askLLM({ projectId, datasetId, query });
            dispatch(appendChatMessage({
                id: Date.now() + 1,
                role: "bot",
                text: formatBotText(result),
            }));
        } catch (err) {
            console.error("LLM request failed:", err);
            dispatch(appendChatMessage({
                id: Date.now() + 1,
                role: "bot",
                text: `Error: ${err.message}`,
            }));
        } finally {
            dispatch(setChatLoading(false));
        }
    };

    const contextBadge = selectedLayer?.datasetName
        ? `Dataset: ${selectedLayer.datasetName}`
        : "No dataset selected";

    return (
        <div className={`flex flex-col h-screen w-full bg-white dark:bg-gray-950 ${className}`}>
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                {!selectedLayer && <AlertTriangle size={14} className="text-amber-500" />}
                <span className="flex-1">{contextBadge}</span>
                <button
                    type="button"
                    onClick={() => dispatch(resetChat())}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1"
                    title="Clear conversation"
                >
                    <RefreshCw size={12} /> Clear
                </button>
            </div>

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
                            {msg.role === "user"
                                ? <p className="whitespace-pre-wrap wrap-break-word">{msg.text}</p>
                                : <MarkdownText text={msg.text} />}
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
