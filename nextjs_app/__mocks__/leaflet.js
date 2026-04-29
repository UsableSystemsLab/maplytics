// Manual mock for leaflet — prevents map/DOM errors in tests
const leaflet = {
  map: jest.fn(() => ({
    setView: jest.fn().mockReturnThis(),
    addLayer: jest.fn(),
    remove: jest.fn(),
    panTo: jest.fn(),
  })),
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  polygon: jest.fn(() => ({ addTo: jest.fn() })),
  geoJSON: jest.fn(() => ({ addTo: jest.fn(), clearLayers: jest.fn() })),
  control: { layers: jest.fn(() => ({ addTo: jest.fn() })) },
  icon: jest.fn(() => ({})),
  divIcon: jest.fn(() => ({})),
  marker: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn() })),
  featureGroup: jest.fn(() => ({ addTo: jest.fn(), getBounds: jest.fn(() => ({})) })),
};

module.exports = leaflet;
