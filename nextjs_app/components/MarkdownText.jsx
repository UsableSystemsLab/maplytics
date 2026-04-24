"use client";

import React from "react";

/**
 * Minimal markdown renderer for chat messages — avoids adding a full
 * markdown dep for the handful of features LLM replies actually use.
 * Handles: fenced code blocks, headings, bullet/ordered lists, inline
 * bold/italic/code, and line breaks.
 */
export default function MarkdownText({ text }) {
    if (!text) return null;
    return <div className="markdown-text space-y-2">{renderBlocks(text)}</div>;
}

function renderBlocks(src) {
    const blocks = [];
    const lines = src.replace(/\r\n/g, "\n").split("\n");
    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (/^```/.test(line)) {
            const fenceEnd = findFenceEnd(lines, i + 1);
            const code = lines.slice(i + 1, fenceEnd).join("\n");
            blocks.push(
                <pre key={key++} className="bg-gray-100 dark:bg-gray-800 rounded-md p-2 overflow-x-auto text-xs">
                    <code>{code}</code>
                </pre>
            );
            i = fenceEnd + 1;
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const content = headingMatch[2];
            const sizes = ["text-lg", "text-base", "text-sm", "text-sm", "text-xs", "text-xs"];
            blocks.push(
                <p key={key++} className={`${sizes[level - 1]} font-semibold`}>
                    {renderInline(content)}
                </p>
            );
            i++;
            continue;
        }

        if (/^\s*[-*]\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
                i++;
            }
            blocks.push(
                <ul key={key++} className="list-disc list-inside space-y-0.5">
                    {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
                </ul>
            );
            continue;
        }

        if (/^\s*\d+\.\s+/.test(line)) {
            const items = [];
            while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
                i++;
            }
            blocks.push(
                <ol key={key++} className="list-decimal list-inside space-y-0.5">
                    {items.map((it, idx) => <li key={idx}>{renderInline(it)}</li>)}
                </ol>
            );
            continue;
        }

        if (line.trim() === "") {
            i++;
            continue;
        }

        const paragraphLines = [];
        while (i < lines.length && lines[i].trim() !== "" && !/^```/.test(lines[i]) && !/^(#{1,6})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
            paragraphLines.push(lines[i]);
            i++;
        }
        blocks.push(
            <p key={key++} className="whitespace-pre-wrap wrap-break-word">
                {renderInline(paragraphLines.join("\n"))}
            </p>
        );
    }
    return blocks;
}

function findFenceEnd(lines, from) {
    for (let j = from; j < lines.length; j++) {
        if (/^```/.test(lines[j])) return j;
    }
    return lines.length;
}

function renderInline(text) {
    const parts = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
    let last = 0;
    let m;
    let key = 0;
    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        const token = m[0];
        if (token.startsWith("```")) {
            parts.push(<code key={key++} className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-xs">{token.slice(1, -1)}</code>);
        } else if (token.startsWith("`")) {
            parts.push(<code key={key++} className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-xs">{token.slice(1, -1)}</code>);
        } else if (token.startsWith("**")) {
            parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith("*") || token.startsWith("_")) {
            parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
        }
        last = regex.lastIndex;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}
