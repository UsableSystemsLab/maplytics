"use client";
import { useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    MapPin,
    ArrowLeft,
    BarChart3,
    Clock,
    AlertCircle
} from "lucide-react";

export default function AnalysisFlipCard() {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 mb-6">
            <div
                className="relative transition-all duration-700 ease-in-out"
                style={{
                    perspective: "1000px",
                    height: isFlipped ? "700px" : "450px"
                }}
            >
                <div
                    className={`relative w-full transition-transform duration-700 transform-style-3d ${isFlipped ? "transform-[rotateY(180deg)]" : ""
                        }`}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    <div
                        className="w-full backface-hidden"
                        style={{ backfaceVisibility: "hidden" }}
                    >
                        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                            <div className="bg-cyan px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-6 h-6 text-white" />
                                    <h3 className="text-xl font-bold text-white">Quick Analysis Summary</h3>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-6 p-5 bg-linear-to-br from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-500">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-6 h-6 text-orange-500 mt-1 shrink-0" />
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900 mb-2">
                                                Traffic Density Alert
                                            </h4>
                                            <p className="text-gray-700">
                                                <span className="font-bold text-orange-600">72% increase</span> in traffic density detected near downtown area during peak hours (7-9 AM)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-[#2C3580]" />
                                            <span className="text-sm font-semibold text-gray-700">Hotspot Zones</span>
                                        </div>
                                        <p className="text-3xl font-bold text-[#2C3580]">5</p>
                                        <p className="text-xs text-gray-600 mt-1">High congestion areas</p>
                                    </div>

                                    <div className="bg-linear-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-5 h-5 text-earthy-green" />
                                            <span className="text-sm font-semibold text-gray-700">Peak Time</span>
                                        </div>
                                        <p className="text-3xl font-bold text-earthy-green">8:15 AM</p>
                                        <p className="text-xs text-gray-600 mt-1">Maximum density</p>
                                    </div>

                                    <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="w-5 h-5 text-purple-600" />
                                            <span className="text-sm font-semibold text-gray-700">Avg Speed</span>
                                        </div>
                                        <p className="text-3xl font-bold text-purple-600">18 km/h</p>
                                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                            <TrendingDown className="w-3 h-3" />
                                            -35% from normal
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleFlip}
                                    className="w-full bg-cyan text-white py-4 rounded-lg font-semibold text-lg hover:from-[#1f2660] hover:to-[#2d3670] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    <BarChart3 className="w-5 h-5" />
                                    Show Detailed Analysis
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        className="absolute top-0 left-0 w-full backface-hidden"
                        style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)"
                        }}
                    >
                        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                            <div className="bg-cyan px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <BarChart3 className="w-6 h-6 text-white" />
                                        <h3 className="text-xl font-bold text-white">Detailed Analysis</h3>
                                    </div>
                                    <button
                                        onClick={handleFlip}
                                        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 max-h-[600px] overflow-y-auto">
                                <div className="mb-6">
                                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-[#2C3580]" />
                                        Traffic Density Over Time
                                    </h4>
                                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 h-64 flex items-end justify-around gap-2">
                                        {[45, 62, 78, 95, 88, 72, 58, 48, 35, 42, 55, 68].map((height, index) => (
                                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                                <div
                                                    className={`w-full rounded-t transition-all ${height > 80
                                                        ? "bg-red-500"
                                                        : height > 60
                                                            ? "bg-orange-400"
                                                            : "bg-earthy-green"
                                                        }`}
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                                <span className="text-xs text-gray-500">{index + 6}h</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-earthy-green rounded"></div>
                                            <span className="text-gray-600">Normal</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-orange-400 rounded"></div>
                                            <span className="text-gray-600">Moderate</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                                            <span className="text-gray-600">High</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-[#2C3580]" />
                                        Top Congestion Zones
                                    </h4>
                                    <div className="space-y-3">
                                        {[
                                            { name: "Downtown Core", level: 95, color: "bg-red-500" },
                                            { name: "Business District", level: 82, color: "bg-orange-500" },
                                            { name: "Shopping Avenue", level: 78, color: "bg-orange-400" },
                                            { name: "University Area", level: 65, color: "bg-yellow-500" },
                                            { name: "Residential Zone", level: 42, color: "bg-earthy-green" }
                                        ].map((zone, index) => (
                                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-gray-900">{zone.name}</span>
                                                    <span className="text-sm font-bold text-gray-600">{zone.level}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div
                                                        className={`${zone.color} h-2.5 rounded-full transition-all`}
                                                        style={{ width: `${zone.level}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-[#2C3580]" />
                                        Key Insights
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                            <p className="text-sm text-gray-800">
                                                <span className="font-bold">Peak Pattern:</span> Traffic density spikes between 7:00-9:00 AM and 5:00-7:00 PM, consistent with commuter patterns.
                                            </p>
                                        </div>
                                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                                            <p className="text-sm text-gray-800">
                                                <span className="font-bold">Bottleneck:</span> Main intersection at Downtown Core shows 40% slower traffic flow, suggesting infrastructure limitations.
                                            </p>
                                        </div>
                                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                                            <p className="text-sm text-gray-800">
                                                <span className="font-bold">Recommendation:</span> Consider implementing dynamic traffic light timing and promoting alternative routes during peak hours.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button className="bg-primary text-white py-3 rounded-lg font-semibold transition-colors">
                                        Export Report
                                    </button>
                                    <button className="bg-cyan text-white py-3 rounded-lg font-semibold transition-colors">
                                        Save Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
