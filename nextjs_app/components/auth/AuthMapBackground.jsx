'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';


const RIYADH_POINTS = [
  [24.7792537, 47.4252319],
  [24.9636502, 47.3977661],
  [25.0457922, 47.2631836],
  [24.9661402, 46.9445801],
  [25.0184177, 46.8374634],
  [25.3117527, 46.8814087],
  [25.4184701, 46.9857788],
  [25.5027845, 46.9775391],
  [25.5789886, 46.8827820],
  [25.5944713, 46.7495728],
  [25.5765112, 46.6623688],
  [25.6365741, 46.6149902],
  [25.4333534, 46.5298462],
  [25.5796079, 46.3595581],
  [25.3589185, 46.0903931],
  [25.1079845, 46.0711670],
  [24.9736097, 46.2469482],
  [24.7867345, 46.3403320],
  [24.7168955, 46.4007568],
  [24.6170573, 46.3732910],
  [24.4396484, 46.4721680],
  [24.4083885, 46.6246033],
  [24.2068896, 46.9033813],
  [24.4471496, 47.0104980],
  [24.2313118, 47.2164917],
  [24.1824628, 47.4822235],
  [24.2494688, 47.6820374],
  [24.3796225, 47.6394653],
  [24.5046441, 47.7081299],
  [24.4983960, 47.5405884],
  [24.6357831, 47.4499512],
  [24.6944388, 47.7383423],
  [24.7306169, 47.6119995],
  [24.7792537, 47.4252319],
];

const MAKKAH_POINTS = [
  [22.2992615, 39.1140747],
  [22.0983646, 39.0454102],
  [21.9608777, 38.9547729],
  [21.7365399, 39.0921021],
  [21.6625335, 39.1223145],
  [21.5092962, 39.1552734],
  [21.5680563, 39.2623901],
  [21.4172762, 39.2486572],
  [21.3328735, 39.2266846],
  [21.1024379, 39.1772461],
  [20.9755454, 39.2685699],
  [20.9216797, 39.3283081],
  [20.9261692, 39.4010925],
  [21.1306215, 39.3338013],
  [21.2484222, 39.5507813],
  [21.1126871, 39.7045898],
  [21.2125798, 39.7787476],
  [20.9793923, 40.0231934],
  [21.1280596, 40.0918579],
  [21.3968194, 40.1632690],
  [21.5782730, 40.0726318],
  [21.6421112, 39.8968506],
  [21.6931615, 39.7457886],
  [21.6165793, 39.6002197],
  [21.6727435, 39.4931030],
  [21.7646014, 39.4601440],
  [21.8360058, 39.3447876],
  [21.9583304, 39.3667603],
  [22.0780046, 39.2788696],
  [22.1975775, 39.2816162],
  [22.2738474, 39.1882324],
  [22.2992615, 39.1140747],
];

const ASIR_POINTS = [
  [28.9600887, 41.4074707],
  [29.4778612, 41.5942383],
  [29.4969876, 41.3635254],
  [29.7548400, 41.6491699],
  [29.9930023, 41.6162109],
  [30.1641263, 41.9897461],
  [30.6000939, 41.5393066],
  [30.7229488, 40.7373047],
  [30.5906370, 40.4956055],
  [29.9358952, 40.1440430],
  [29.7071393, 39.5947266],
  [29.9263742, 39.0673828],
  [29.1329701, 38.2214355],
  [28.9600887, 38.4301758],
  [28.9216313, 38.8696289],
  [28.4976608, 38.8037109],
  [28.6327468, 39.2102051],
  [28.3430649, 39.2871094],
  [28.5459257, 39.8254395],
  [28.8927789, 40.5725098],
  [28.9600887, 41.4074707],
];

export default function AuthMapBackground({ children }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const L = require('leaflet');

    const center = [24.7, 44.5];

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    }).setView(center, 6);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 18 }
    ).addTo(map);

    [RIYADH_POINTS, MAKKAH_POINTS, ASIR_POINTS].forEach((coords) => {
      L.polygon(coords, {
        color: '#22c55e',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.25,
      }).addTo(map);
    });

    return () => map.remove();
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#262626]">
      {/* Leaflet map */}
      <div
        ref={mapRef}
        className="auth-map-bg absolute inset-0 z-0 pointer-events-none"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Branding - left side, large screens only */}
      <div className="hidden lg:flex absolute inset-y-0 left-0 w-[40%] flex-col items-center justify-center z-20">
        <div className="text-center">
          <div className="inline-block overflow-hidden">
            <h1
              className="typing-animation text-5xl xl:text-7xl font-bold tracking-tight mb-2 overflow-hidden whitespace-nowrap border-r-4 border-white/70 pr-1"
            >
              <span className="text-white">MAPLYTICS</span>
            </h1>
          </div>
          <p
            className="opacity-0 animate-[fadeIn_1s_ease-out_2.5s_forwards] text-white/70 text-lg xl:text-xl font-medium pt-6"
          >
            Spatial Analysis Simplified
          </p>
        </div>
      </div>

      {/* Form content - right side on lg, centered on mobile */}
      <div className="absolute inset-0 z-30 flex items-center justify-center lg:justify-end overflow-y-auto">
        <div className="w-full lg:w-[60%] flex items-center justify-center p-6 md:p-12 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
