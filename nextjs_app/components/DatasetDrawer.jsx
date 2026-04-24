"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import { Search, Loader2, Database, Globe, MapPin, FileJson, Check } from "lucide-react";
import { getDatasets, searchDatasets } from "@/lib/datasetApi";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  selectSelectedLayer,
  setSelectedLayer,
  clearSelectedLayer,
} from "@/lib/store/features/layerSlice";

export default function DatasetDrawer({ isOpen, onClose, activeProject }) {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const selectedLayer = useSelector(selectSelectedLayer);
  const selectedDatasetId = selectedLayer?.datasetId || null;
  const [activeTab, setActiveTab] = useState("my");
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleToggleDataset = (dataset) => {
    const alreadySelected = selectedDatasetId === dataset.id;

    if (alreadySelected) {
      dispatch(clearSelectedLayer());
      window.dispatchEvent(new CustomEvent('layerSelected', { detail: null }));
      return;
    }

    const payload = {
      projectId: null,
      datasetId: dataset.id,
      datasetName: dataset.name,
    };
    dispatch(setSelectedLayer(payload));
    window.dispatchEvent(new CustomEvent('layerSelected', { detail: payload }));
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="border-b">
          <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Plot Datasets
          </DrawerTitle>
          <DrawerDescription>
            Select a dataset to visualize it directly on the map.
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="my" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                My Library
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Public Collections
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Loading datasets...</p>
                </div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">No datasets found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  {datasets.map((dataset) => {
                    const isSelected = selectedDatasetId === dataset.id;
                    
                    return (
                      <div
                        key={dataset.id}
                        className={cn(
                          "p-4 border rounded-xl hover:border-primary/50 transition-all bg-card group relative flex flex-col cursor-pointer",
                          isSelected && "border-primary ring-1 ring-primary bg-primary/5"
                        )}
                        onClick={() => handleToggleDataset(dataset)}
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
                          {dataset.description || "No description provided."}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {dataset.feature_count.toLocaleString()} features
                          </span>
                          
                          <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                            {isSelected ? "Selected · click to deselect" : "Select"}
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
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
