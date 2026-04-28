'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useTranslations } from 'next-intl';
import 'leaflet/dist/leaflet.css';
import { ChevronDown } from 'lucide-react';

const generateHeatmapPolygons = () => {
    const polygons = [];
    const minLat = 24.50;
    const maxLat = 24.90;
    const minLng = 46.45;
    const maxLng = 46.85;

    const stepsLat = 15;
    const stepsLng = 15;

    const stepLat = (maxLat - minLat) / stepsLat;
    const stepLng = (maxLng - minLng) / stepsLng;

    const hotspots = [
        { lat: 24.711, lng: 46.674, weight: 1.0 }, // Kingdom Center
        { lat: 24.761, lng: 46.640, weight: 0.9 }, // KAFD
        { lat: 24.846, lng: 46.732, weight: 0.8 }, // Airport Area
        { lat: 24.682, lng: 46.623, weight: 0.8 }, // DQ
        { lat: 24.630, lng: 46.710, weight: 0.7 }, // South Riyadh
        { lat: 24.734, lng: 46.575, weight: 0.6 }  // Diriyah
    ];

    const colors = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'];

    for (let i = 0; i < stepsLat; i++) {
        for (let j = 0; j < stepsLng; j++) {
            const lat1 = minLat + i * stepLat;
            const lat2 = lat1 + stepLat;
            const lng1 = minLng + j * stepLng;
            const lng2 = lng1 + stepLng;

            const cellCenterLat = (lat1 + lat2) / 2;
            const cellCenterLng = (lng1 + lng2) / 2;

            let intensity = 0;
            hotspots.forEach(spot => {
                const dist = Math.sqrt(Math.pow(cellCenterLat - spot.lat, 2) + Math.pow(cellCenterLng - spot.lng, 2));
                if (dist < 0.12) {
                    intensity += spot.weight * Math.pow(1 - (dist / 0.12), 2);
                }
            });

            intensity += (Math.random() * 0.15);

            if (intensity < 0.15 && Math.random() > 0.2) continue;

            let colorIndex = Math.floor(intensity * colors.length * 0.8);
            if (colorIndex < 0) colorIndex = 0;
            if (colorIndex >= colors.length) colorIndex = colors.length - 1;

            polygons.push({
                color: colors[colorIndex],
                opacity: Math.max(0.1, Math.min(0.6, intensity * 1.6)),
                coords: [
                    [lat1, lng1],
                    [lat1, lng2],
                    [lat2, lng2],
                    [lat2, lng1]
                ]
            });
        }
    }
    return polygons;
};

export default function HeroSection({ onScrollDown }) {
    const t = useTranslations('landing.hero');
    const mapRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const L = require('leaflet');
        const center = [24.7136, 46.6753]; // Riyadh
        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
        }).setView(center, window.innerWidth < 768 ? 7 : 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20
        }).addTo(map);

        const heatmapPolygons = generateHeatmapPolygons();
        heatmapPolygons.forEach(({ color, opacity, coords }) => {
            L.polygon(coords, {
                stroke: false,
                fillColor: color,
                fillOpacity: opacity,
                className: 'hero-polygon',
            }).addTo(map);
        });

        // Optional parallax on large screens
        if (window.innerWidth >= 768) {
            const handleMouseMove = (e) => {
                const x = (e.clientX / window.innerWidth - 0.5) * 0.05;
                const y = (e.clientY / window.innerHeight - 0.5) * 0.05;

                map.panTo([center[0] - y, center[1] + x], {
                    animate: true,
                    duration: 0.4,
                });
            };

            window.addEventListener('mousemove', handleMouseMove);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                map.remove();
            };
        }

        return () => map.remove();
    }, []);

    return (
        <section className="relative w-screen h-screen flex items-center justify-center px-6 sm:px-10 bg-[#262626]">

            {/* Map */}
            <div
                ref={mapRef}
                className="absolute inset-0 z-0 pointer-events-none"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 z-10" />

            {/* Content */}
            <div className="relative z-20 text-center max-w-5xl mx-auto">
                <h1 className="
                    text-2xl sm:text-4xl lg:text-6xl rtl:lg:text-7xl
                    font-bold leading-12 md:leading-24 rtl:lg:leading-32 text-white capitalize
                ">
                    {t.rich('title', {
                        line1: (chunks) => <div className="whitespace-nowrap">{chunks}</div>,
                        line2: (chunks) => <div className="whitespace-nowrap">{chunks}</div>,
                        geo: (chunks) => <span className="bg-earthy-green px-1">{chunks}</span>,
                        maps: (chunks) => <span className="bg-[#2C3580] px-1">{chunks}</span>,
                    })}
                </h1>

                <p className="
                    mt-6 text-sm md:text-lg
                    text-gray-300 font-medium mx-auto
                ">
                    {t('description')}
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mx-auto md:max-w-md">
                    <Link href="/dashboard" className="w-full">
                        <Button
                            size="lg"
                            className="w-full bg-primary text-white text-base sm:text-lg py-6 sm:py-8 rounded-md shadow-xl hover:bg-primary/90 transition-all"
                        >
                            {t('tryNow')}
                        </Button>
                    </Link>
                    <Button
                        onClick={onScrollDown}
                        variant="secondary"
                        className="w-full text-base sm:text-lg py-6 sm:py-8 rounded-md"
                    >
                        {t('exploreMore')}
                    </Button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-30">
                <button
                    onClick={onScrollDown}
                    className="flex flex-col items-center text-white/80 hover:text-white transition"
                >
                    <span className="text-xs sm:text-sm mb-1 tracking-wide">{t('scroll')}</span>
                    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                </button>
            </div>
        </section>
    );
}