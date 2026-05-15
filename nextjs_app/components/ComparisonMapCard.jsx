"use client";

import dynamic from "next/dynamic";
import { MapPin, Loader2, Layers } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

// Lazy-load Leaflet (SSR-incompatible)
const ComparisonMap = dynamic(() => import("@/components/ComparisonMap"), {
    loading: () => (
        <div className="w-full h-full bg-gray-50 animate-pulse flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
    ),
    ssr: false,
});

export default function ComparisonMapCard({
    side = "a",
    color,
    data = null,
    processing = false,
}) {
    const t = useTranslations("comparison.card");
    const isA = side === "a";
    const label = data?.name || (isA ? t('locationA') : t('locationB'));
    const featureCount =
        data?.featureCount || data?.count || data?.geojson?.features?.length || 0;
    const hasData = !!data?.geojson;
    const mapId = `comparison-side-${side}`;

    return (
        <Card
            className={`group overflow-hidden border transition-all ${
                isA
                    ? "hover:border-primary/20 hover:shadow-md"
                    : "hover:border-cyan/30 hover:shadow-md"
            }`}
        >
            {/* Colour accent bar */}
            <div className="h-1" style={{ backgroundColor: color }} />

            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                                isA
                                    ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                                    : "bg-cyan/10 text-cyan group-hover:bg-cyan group-hover:text-white"
                            }`}
                        >
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{label}</CardTitle>
                            <CardDescription>
                                {hasData
                                    ? `${featureCount} ${t('featuresFound')}`
                                    : t('awaiting')}
                            </CardDescription>
                        </div>
                    </div>
                    {hasData && (
                        <Badge variant="secondary" className="text-xs gap-1">
                            <Layers className="h-3 w-3" />
                            {featureCount}
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* z-index containment prevents Leaflet from overlapping drawers/modals */}
                <div className="h-[400px] relative bg-gray-50 comparison-map-contain">
                    <ComparisonMap
                        mapId={mapId}
                        center={[24.7136, 46.6753]}
                        zoom={11}
                        featurePoints={hasData ? data.geojson : null}
                        boundaryGeoJSON={hasData ? data.boundary || null : null}
                        color={color}
                    />

                    {/* Processing overlay — shown ON TOP of the live map */}
                    {!hasData && processing && (
                        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
                            <div className="relative">
                                <div
                                    className="h-14 w-14 border-4 rounded-full animate-spin"
                                    style={{
                                        borderColor: `${color}15`,
                                        borderTopColor: color,
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <MapPin
                                        className="h-5 w-5"
                                        style={{ color: `${color}60` }}
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-3 animate-pulse">
                                {t('analyzing', { side: isA ? 'A' : 'B' })}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
