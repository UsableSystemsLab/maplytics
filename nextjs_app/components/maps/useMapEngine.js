"use client";
import { useContext } from "react";
import { MapEngineContext } from "@/components/maps/MapEngineContext";

export function useMapEngine() {
  return useContext(MapEngineContext);
}
