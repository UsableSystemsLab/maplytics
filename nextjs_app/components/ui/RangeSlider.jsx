"use client";
import { useMemo } from "react";

export default function RangeSlider({ min, max, value, onChange, step }) {
    const effectiveStep = step ?? (max - min > 20 ? 1 : 0.1);
    const currentMin = value?.min ?? min;
    const currentMax = value?.max ?? max;
    const span = max - min || 1;

    const pctMin = useMemo(() => ((currentMin - min) / span) * 100, [currentMin, min, span]);
    const pctMax = useMemo(() => ((currentMax - min) / span) * 100, [currentMax, min, span]);

    const handleMinChange = (e) => {
        const next = Math.min(Number(e.target.value), currentMax);
        onChange({ min: next, max: currentMax });
    };
    const handleMaxChange = (e) => {
        const next = Math.max(Number(e.target.value), currentMin);
        onChange({ min: currentMin, max: next });
    };

    const thumbStyles = "appearance-none bg-transparent pointer-events-none " +
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white " +
        "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary " +
        "[&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:pointer-events-auto " +
        "[&::-webkit-slider-thumb]:cursor-grab " +
        "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full " +
        "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary " +
        "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:cursor-grab";

    return (
        <div className="w-full">
            <div className="relative h-6 flex items-center">
                <div className="absolute inset-x-0 h-1 bg-gray-200 rounded-full" />
                <div
                    className="absolute h-1 bg-primary rounded-full"
                    style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={effectiveStep}
                    value={currentMin}
                    onChange={handleMinChange}
                    className={`absolute inset-0 w-full h-6 ${thumbStyles}`}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={effectiveStep}
                    value={currentMax}
                    onChange={handleMaxChange}
                    className={`absolute inset-0 w-full h-6 ${thumbStyles}`}
                />
            </div>
            <div className="flex items-center gap-2 mt-2">
                <input
                    type="number"
                    value={currentMin}
                    min={min}
                    max={currentMax}
                    step={effectiveStep}
                    onChange={handleMinChange}
                    className="w-20 text-xs px-2 py-1 border border-gray-300 rounded"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                    type="number"
                    value={currentMax}
                    min={currentMin}
                    max={max}
                    step={effectiveStep}
                    onChange={handleMaxChange}
                    className="w-20 text-xs px-2 py-1 border border-gray-300 rounded"
                />
            </div>
        </div>
    );
}
