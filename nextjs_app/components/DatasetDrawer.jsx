"use client";

import React, { useState, useEffect } from "react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Database, Globe, MapPin, FileJson, Upload, Plus, X } from "lucide-react";
import { getDatasets, searchDatasets } from "@/lib/datasetApi";
import { uploadFile } from "@/lib/uploadApi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useDispatch, useSelector } from "react-redux";
import { toggleLayer, selectSelectedLayers } from "@/lib/store/features/layersSlice";
import { useTranslations } from "next-intl";


export default function DatasetDrawer({ isOpen, onClose, activeProject }) {
  const t = useTranslations("datasets");
  const tDrawer = useTranslations("datasets.drawer");
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [uploadName, setUploadName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const selectedLayers = useSelector(selectSelectedLayers);
  const isLayerSelected = (id) => selectedLayers.some(l => l.id === id);

  const fetchDatasets = async (tab = activeTab, query = searchQuery) => {
    if (!user && tab === "my") {
      setDatasets([]);
      return;
    }

    setLoading(true);
    try {
      let data;
      if (query.trim()) {
        data = await searchDatasets(query, { is_public: tab === "public" });
      } else {
        data = await getDatasets({ is_public: tab === "public" });
      }
      setDatasets(data.datasets || []);
    } catch (error) {
      console.error("Error fetching datasets:", error);
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDatasets();
    }
  }, [isOpen, activeTab]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) fetchDatasets();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleActivateDataset = (dataset) => {
    dispatch(toggleLayer({
      id: dataset.id,
      name: dataset.name,
      type: dataset.geometry_type || "GEO",
      pgDatasetId: null, // This is a raw dataset, not a project dataset
      projectId: null,
    }));
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            {tDrawer('title')}
          </DrawerTitle>
          <DrawerDescription>
            {tDrawer('description')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="relative mb-6">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-11 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="my" className={cn(
                "flex items-center gap-2 rounded-md font-semibold text-sm transition-all",
                activeTab === "my" ? "bg-primary text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
              )}>
                <Database className="w-4 h-4" />
                {tDrawer('myLibrary')}
              </TabsTrigger>
              <TabsTrigger value="public" className={cn(
                "flex items-center gap-2 rounded-md font-semibold text-sm transition-all",
                activeTab === "public" ? "bg-cyan text-white shadow-sm" : "text-gray-600 hover:text-gray-800"
              )}>
                <Globe className="w-4 h-4" />
                {tDrawer('publicCollections')}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pe-2">
              {user && (
                <div className="mb-4">
                  {showUpload ? (
                    <div className="p-4 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800">{t('uploadLabel')}</p>
                        <button onClick={() => { setShowUpload(false); setUploadingFile(null); setUploadName(""); }} className="text-gray-400 hover:text-gray-600 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder={t('namePlaceholder')}
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-white text-sm text-gray-600 transition-colors">
                          <Upload className="w-4 h-4" />
                          {uploadingFile ? uploadingFile.name : (t('dragDrop') || 'Choose file')}
                          <input type="file" accept=".json,.geojson,.xlsx,.xls" className="sr-only" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setUploadingFile(f);
                              if (!uploadName) setUploadName(f.name.replace(/\.[^/.]+$/, ""));
                            }
                          }} />
                        </label>
                        <Button
                          size="sm"
                          disabled={!uploadingFile || !uploadName.trim() || isUploading}
                          onClick={async () => {
                            setIsUploading(true);
                            try {
                              await uploadFile({ file: uploadingFile, isPrivate: activeTab === "my", layerName: uploadName.trim() });
                              setShowUpload(false); setUploadingFile(null); setUploadName("");
                              fetchDatasets();
                            } catch (err) { console.error("Upload failed:", err); }
                            finally { setIsUploading(false); }
                          }}
                          className="shrink-0"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('uploadAction')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-2 text-primary hover:bg-primary/5"
                      onClick={() => setShowUpload(true)}
                    >
                      <Plus className="w-4 h-4 me-2" />
                      {t('addDataset')}
                    </Button>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>{tDrawer('loading')}</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">{tDrawer('noResults')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {datasets.map((dataset) => {
                    const isSelected = isLayerSelected(dataset.id);
                    
                    return (
                      <div 
                        key={dataset.id} 
                        className={cn(
                          "p-4 border rounded-xl hover:border-primary/50 transition-all bg-card group relative flex flex-col cursor-pointer",
                          isSelected && "border-primary ring-1 ring-primary bg-primary/5"
                        )}
                        onClick={() => handleActivateDataset(dataset)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            isSelected ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                          )}>
                            <FileJson className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {dataset.geometry_type || "GEO"}
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-sm line-clamp-1 mb-1">{dataset.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-4">
                          {dataset.description || tDrawer('noDescriptionShort')}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {dataset.feature_count.toLocaleString()} {tDrawer('features')}
                          </span>

                          <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                            <MapPin className="w-3.5 h-3.5" />
                            {isSelected ? tDrawer('active') : tDrawer('activate')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </div>

        <DrawerFooter className="border-t">
          <DrawerClose asChild>
            <Button variant="outline">{tDrawer('close')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
