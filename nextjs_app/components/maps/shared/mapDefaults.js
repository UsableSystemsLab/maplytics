// Engine-agnostic constants shared between Leaflet and Mapbox engines.
// Riyadh-centered default view to match the existing app.

export const DEFAULT_CENTER = [24.7136, 46.6753];  // [lat, lng]
export const DEFAULT_ZOOM = 12;

export const SAUDI_CENTER = [23.8859, 45.0792];    // [lat, lng] — matches BoundaryMap default
export const SAUDI_ZOOM = 6;

// Mapbox style URL (single source of truth — change here to swap default style).
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';

// Heatmap gradient roughly matching leaflet.heat defaults (used as reference by both engines).
export const HEATMAP_GRADIENT = {
  0.2: '#0000ff',
  0.4: '#00ff00',
  0.6: '#ffff00',
  0.8: '#ff7f00',
  1.0: '#ff0000',
};
