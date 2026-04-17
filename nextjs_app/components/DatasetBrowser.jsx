"use client";
import React, { useState, useEffect } from 'react';
import { Eye, FileJson, Clock, HardDrive, User, X, Loader2, Search, Plus, Upload, AlertCircle } from 'lucide-react';
import { getDatasets, searchDatasets, ingestDatasetFromFile } from '@/lib/datasetApi';
import { useTranslations } from 'next-intl';

export default function DatasetBrowser() {
    const t = useTranslations("datasets");
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState(null);
    const [previewTitle, setPreviewTitle] = useState("");

    // Data States
    const [datasets, setDatasets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Add Dataset States
    const [newDatasetFile, setNewDatasetFile] = useState(null);
    const [newDatasetName, setNewDatasetName] = useState("");
    const [newDatasetDescription, setNewDatasetDescription] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    useEffect(() => {
        fetchDatasets();
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                fetchDatasets();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchDatasets = async () => {
        try {
            setIsLoading(true);
            const data = await getDatasets();
            setDatasets(data.datasets || []);
            setError(null);
        } catch (err) {
            console.error("Error fetching datasets:", err);
            setError(t('error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            setIsSearching(true);
            const data = await searchDatasets(searchQuery);
            setDatasets(data.datasets || []);
        } catch (err) {
            console.error("Error searching datasets:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const handlePreview = async (dataset) => {
        setPreviewTitle(dataset.dataset_name);
        setIsPreviewModalOpen(true);
        setPreviewContent(null);
        setPreviewContent(JSON.stringify(dataset, null, 2));
    };

    const closePreviewModal = () => {
        setIsPreviewModalOpen(false);
        setPreviewContent(null);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setNewDatasetFile(null);
        setNewDatasetName("");
        setNewDatasetDescription("");
        setUploadError(null);
        setUploadSuccess(false);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setNewDatasetFile(e.target.files[0]);
            // Auto-fill name if empty
            if (!newDatasetName) {
                const fileName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
                setNewDatasetName(fileName.charAt(0).toUpperCase() + fileName.slice(1));
            }
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!newDatasetFile || !newDatasetName) {
            setUploadError(t('validation.nameFileRequired'));
            return;
        }

        try {
            setIsUploading(true);
            setUploadError(null);

            await ingestDatasetFromFile(
                newDatasetFile,
                newDatasetName,
                'generic', // default entity type
                false // no force override for now
            );

            setUploadSuccess(true);
            setTimeout(() => {
                closeAddModal();
                fetchDatasets(); // Refresh list
            }, 1000); // Close after 1.5s
        } catch (err) {
            console.error("Upload error:", err);
            setUploadError(err.message || t('validation.failedUpload'));
        } finally {
            setIsUploading(false);
        }
    };

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper to format size (simulated as feature count for now as size isn't in top level metadata)
    const formatSize = (count) => {
        return t('items', { count });
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                    <p className="text-gray-500 mt-1">{t('description')}</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {t('addDataset')}
                </button>
            </div>

            {/* Search Section */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            {/* Content Section */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>{t('loading')}</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center text-red-600">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>{error}</p>
                    <button
                        onClick={fetchDatasets}
                        className="mt-4 text-sm font-medium underline hover:text-red-700"
                    >
                        {t('tryAgain')}
                    </button>
                </div>
            ) : datasets.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <FileJson className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 font-medium">{t('noDatasetsFound')}</h3>
                    <p className="text-gray-500 text-sm mt-1">{t('noDatasetsDescription')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {datasets.map((dataset) => (
                        <div key={dataset.dataset_id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col group">
                            <div className="h-40 bg-gray-100 relative flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                <FileJson className="w-12 h-12 text-gray-400 opacity-60 group-hover:text-primary/60 transition-colors" />
                                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full uppercase font-medium">
                                    {dataset.geometry_type || t('unknown')}
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 line-clamp-1" title={dataset.dataset_name}>
                                            {dataset.dataset_name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <User className="w-3 h-3" />
                                            <span>{dataset.author || t('unknownUser')}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-4 line-clamp-2" title={dataset.description}>
                                    {dataset.description || t('noDescription')}
                                </p>

                                <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1.5" title={t('featureCount')}>
                                            <HardDrive className="w-3.5 h-3.5" />
                                            {formatSize(dataset.feature_count)}
                                        </div>
                                        <div className="flex items-center gap-1.5" title={t('lastUpdated')}>
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDate(dataset.last_updated)}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handlePreview(dataset)}
                                        className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                        title={t('previewDetails')}
                                    >
                                        <Eye className="w-4 h-4" />
                                        {t('preview')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {isPreviewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileJson className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{previewTitle}</h3>
                                    <p className="text-xs text-gray-500">{t('properties')}</p>
                                </div>
                            </div>
                            <button
                                onClick={closePreviewModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 bg-gray-50">
                            <pre className="bg-white p-4 rounded-lg border border-gray-200 text-sm font-mono text-gray-700 overflow-auto shadow-sm">
                                <code>{previewContent}</code>
                            </pre>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                            <button
                                onClick={closePreviewModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {t('close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Dataset Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">{t('addNewTitle')}</h3>
                            <button
                                onClick={closeAddModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('nameLabel')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newDatasetName}
                                    onChange={(e) => setNewDatasetName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder={t('namePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('descriptionLabel')} <span className="text-gray-400 font-normal">{t('optional')}</span>
                                </label>
                                <textarea
                                    rows="3"
                                    value={newDatasetDescription}
                                    onChange={(e) => setNewDatasetDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder={t('descriptionPlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('uploadLabel')}
                                </label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <div className="space-y-1 text-center">
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                                                <span>{t('uploadButton')}</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".json,.geojson" onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">{t('dragDrop')}</p>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {t('uploadHint')}
                                        </p>
                                        {newDatasetFile && (
                                            <p className="text-sm text-green-600 font-medium mt-2">
                                                {t('selected')} {newDatasetFile.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {uploadError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            {uploadSuccess && (
                                <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span>{t('uploadSuccess')}</span>
                                </div>
                            )}

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeAddModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading || uploadSuccess}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isUploading ? t('uploading') : t('uploadAction')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
