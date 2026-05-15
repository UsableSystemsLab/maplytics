"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AnalysisFlipCard from "@/components/AnalysisFlipCard";
import { getProjectDatasetData } from "@/lib/datasetApi";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
    const { user } = useAuth();
    const t = useTranslations("dashboard");
    const searchParams = useSearchParams();
    const projectId = searchParams.get("projectId");
    const datasetId = searchParams.get("datasetId");
    const nameParam = searchParams.get("name");

    const [features, setFeatures] = useState(null);
    const [fieldsMetadata, setFieldsMetadata] = useState([]);
    const [datasetName, setDatasetName] = useState(nameParam || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!projectId || !datasetId) return;

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const result = await getProjectDatasetData(
                    projectId,
                    datasetId,
                    user?.uid
                );
                if (cancelled) return;

                setFeatures(result.geojson?.features ?? []);
                setFieldsMetadata(result.fields ?? []);
            } catch (err) {
                console.error("Failed to load dataset for chart:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [projectId, datasetId, user?.uid]);

    return (
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
            <div className="w-full max-w-7xl space-y-6">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan" />
                        <span className="text-gray-500">
                            {t('loadingDataset')}
                        </span>
                    </div>
                ) : (
                    <AnalysisFlipCard
                        features={features}
                        fieldsMetadata={fieldsMetadata}
                        datasetName={datasetName}
                        featureCount={features?.length}
                    />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {t('totalProjects')}
                        </h3>
                        <p className="text-3xl font-bold text-primary">
                            12
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {t('totalProjectsHint')}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {t('activeLayers')}
                        </h3>
                        <p className="text-3xl font-bold text-cyan">24</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {t('activeLayersHint')}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {t('teamMembers')}
                        </h3>
                        <p className="text-3xl font-bold text-primary">
                            8
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {t('teamMembersHint')}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        {t('recentActivity')}
                    </h2>
                    <p className="text-gray-600">
                        {t('recentActivityEmpty')}
                    </p>
                </div>
            </div>
        </main>
    );
}