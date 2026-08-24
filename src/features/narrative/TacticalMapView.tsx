import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import brandLogo from '../../assets/lANDWARGAMING.svg';
import styles from './TacticalMapView.module.css';

interface InspectResult {
  lon: number;
  lat: number;
  valid: boolean;
  raw_value: number | null;
  label: string;
  color: string;
  description: string;
}

interface SuitableSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  score: number;
  sector: string;
  description: string;
}

// Exact surveyed high/optimal suitability locations in the Bridge_Suitability dataset
const OPTIMAL_BRIDGING_SITES: SuitableSite[] = [
  {
    id: 'site-1',
    name: 'Kargil North Riverbed',
    lat: 34.85605,
    lon: 76.43188,
    score: 5,
    sector: 'Kargil Central',
    description: 'Optimal Class 5: Wide river channel, firm gravel/rock base, gentle bank slope for tracked vehicles.',
  },
  {
    id: 'site-2',
    name: 'Suru River Crossing Alpha',
    lat: 34.80079,
    lon: 76.52013,
    score: 5,
    sector: 'Suru Valley',
    description: 'Optimal Class 5: Ideal natural bridgehead with solid bedrock anchoring and low water scouring.',
  },
  {
    id: 'site-3',
    name: 'Sankoo Approach Crossing',
    lat: 34.77225,
    lon: 76.54550,
    score: 5,
    sector: 'Dras / Sankoo',
    description: 'Optimal Class 5: Flat road connectivity, minimal earthwork needed, low bank elevation delta.',
  },
  {
    id: 'site-4',
    name: 'Batalik Sector Riverbank',
    lat: 34.98375,
    lon: 76.37549,
    score: 5,
    sector: 'Batalik Sector',
    description: 'Optimal Class 5: High-strength granite embankment, suitable for heavy assault bridge sets.',
  },
  {
    id: 'site-5',
    name: 'Rangdum Valley Transition',
    lat: 34.34166,
    lon: 76.56256,
    score: 5,
    sector: 'Southern Ladakh',
    description: 'Optimal Class 5: Shallow braid channel with firm subgrade, excellent tactical deployment area.',
  },
];

const BASEMAPS = [
  {
    id: 'osm',
    name: 'OpenStreetMap (Standard Street Map)',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'topo',
    name: 'OpenTopoMap (Terrain & Mountain Contours)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap',
  },
  {
    id: 'satellite',
    name: 'Esri Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  },
];

const COLORMAPS = [
  { id: 'rdylgn', name: 'Suitability (Red → Yellow → Green)' },
  { id: 'viridis', name: 'Viridis (Purple → Teal → Yellow)' },
  { id: 'terrain', name: 'Terrain (Green → Brown → White)' },
  { id: 'plasma', name: 'Plasma (Blue → Red → Yellow)' },
];

const THRESHOLD_FILTERS = [
  { id: 'all', name: 'Show All Terrain (Classes 1 - 5)', min: 1, max: 5 },
  { id: 'suitable', name: 'Moderate & Above (Classes 3 - 5)', min: 3, max: 5 },
  { id: 'high', name: 'High & Optimal Only (Classes 4 - 5)', min: 4, max: 5 },
  { id: 'optimal', name: 'Optimal Sites Only (Class 5 - Green)', min: 5, max: 5 },
];

export function TacticalMapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const rasterTileLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const siteMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  // States
  const [activeTab, setActiveTab] = useState<'sites' | 'layers' | 'symbology' | 'inspect'>('sites');
  const [activeBasemap, setActiveBasemap] = useState<string>('osm');
  const [rasterEnabled, setRasterEnabled] = useState<boolean>(true);
  const [selectedColormap, setSelectedColormap] = useState<string>('rdylgn');
  const [selectedThreshold, setSelectedThreshold] = useState<string>('all');
  const [rasterOpacity, setRasterOpacity] = useState<number>(0.85);

  // Inspection
  const [inspectData, setInspectData] = useState<InspectResult | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center in Ladakh / Kargil where the dataset is located
    const map = L.map(mapContainerRef.current, {
      center: [34.78, 76.50],
      zoom: 10,
      zoomControl: true,
    });

    // Default OpenStreetMap
    const baseLayer = L.tileLayer(BASEMAPS[0].url, {
      maxZoom: 19,
      attribution: BASEMAPS[0].attribution,
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Site markers group (shows green pins for the top optimal sites)
    const sitesGroup = L.layerGroup().addTo(map);
    OPTIMAL_BRIDGING_SITES.forEach((site) => {
      const pin = L.circleMarker([site.lat, site.lon], {
        radius: 7,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95,
      });

      pin.bindTooltip(`<strong>${site.name}</strong><br/>Score: Class 5 (Optimal)`, {
        direction: 'top',
        offset: [0, -6],
      });

      pin.on('click', () => {
        setInspectData({
          lon: site.lon,
          lat: site.lat,
          valid: true,
          raw_value: 5,
          label: 'Very High (Optimal)',
          color: '#1a9850',
          description: site.description,
        });
        setActiveTab('inspect');
      });

      sitesGroup.addLayer(pin);
    });
    siteMarkersGroupRef.current = sitesGroup;

    // Click Marker Group
    const markerGroup = L.layerGroup().addTo(map);
    markerLayerGroupRef.current = markerGroup;

    // Click anywhere on map to inspect pixel value
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      try {
        const res = await fetch(`http://localhost:8001/api/inspect?lon=${lng}&lat=${lat}&url=output/bridge_suitability_cog.tif`);
        if (res.ok) {
          const data: InspectResult = await res.json();
          setInspectData(data);
          setActiveTab('inspect');

          markerGroup.clearLayers();
          const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: data.color || '#3b82f6',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          });

          marker.bindPopup(`
            <strong>${data.label}</strong> (Class ${data.raw_value ?? 'N/A'})<br/>
            <small>${data.description}</small><br/>
            <code>${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E</code>
          `).openPopup();

          markerGroup.addLayer(marker);
        }
      } catch (err) {
        console.error('Inspect failed:', err);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const basemapConfig = BASEMAPS.find((b) => b.id === activeBasemap) || BASEMAPS[0];

    if (baseTileLayerRef.current && map.hasLayer(baseTileLayerRef.current)) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const newBase = L.tileLayer(basemapConfig.url, {
      maxZoom: 19,
      attribution: basemapConfig.attribution,
    });
    newBase.addTo(map);
    baseTileLayerRef.current = newBase;

    // Keep raster and markers on top
    if (rasterTileLayerRef.current && map.hasLayer(rasterTileLayerRef.current)) {
      rasterTileLayerRef.current.bringToFront();
    }
  }, [activeBasemap]);

  // Update Raster Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (rasterTileLayerRef.current && map.hasLayer(rasterTileLayerRef.current)) {
      map.removeLayer(rasterTileLayerRef.current);
      rasterTileLayerRef.current = null;
    }

    if (rasterEnabled) {
      const thresholdConfig = THRESHOLD_FILTERS.find((t) => t.id === selectedThreshold) || THRESHOLD_FILTERS[0];

      let tileUrl = `http://localhost:8001/cog/tiles/{z}/{x}/{y}.png?url=output/bridge_suitability_cog.tif&colormap_name=${selectedColormap}`;
      if (selectedThreshold !== 'all') {
        tileUrl += `&min_class=${thresholdConfig.min}&max_class=${thresholdConfig.max}`;
      }

      const newRaster = L.tileLayer(tileUrl, {
        maxZoom: 19,
        opacity: rasterOpacity,
        attribution: 'TiTiler Bridge Suitability',
      });

      newRaster.addTo(map);
      rasterTileLayerRef.current = newRaster;
    }
  }, [rasterEnabled, selectedColormap, selectedThreshold]);

  // Update Opacity in Real Time
  useEffect(() => {
    if (rasterTileLayerRef.current) {
      rasterTileLayerRef.current.setOpacity(rasterOpacity);
    }
  }, [rasterOpacity]);

  // Jump to specific optimal site
  const handleJumpToSite = (site: SuitableSite) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([site.lat, site.lon], 13, { duration: 1.2 });
    setInspectData({
      lon: site.lon,
      lat: site.lat,
      valid: true,
      raw_value: site.score,
      label: 'Class 5: Very High (Optimal)',
      color: '#1a9850',
      description: site.description,
    });
    setActiveTab('inspect');
  };

  const handleZoomFullSector = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.fitBounds([[34.2662, 76.0938], [34.9868, 76.9947]], { padding: [30, 30] });
  };

  return (
    <div className={styles.container}>
      {/* Brand Header */}
      <div className={styles.brandHeader}>
        <img src={brandLogo} alt="Land Wargaming" className={styles.brandImg} />
      </div>

      {/* Main Map Viewport */}
      <div className={styles.mapViewport} aria-label="Tactical Map Viewport">
        <div ref={mapContainerRef} className={styles.leafletContainer} />

        {/* Quick Toolbar (Top Left) */}
        <div className={styles.toolBarTopLeft}>
          <button className={styles.toolBtn} onClick={handleZoomFullSector} title="Fit entire Ladakh/Kargil sector in view">
            <span>🎯 Zoom Sector</span>
          </button>
          <button
            className={styles.toolBtn}
            onClick={() => handleJumpToSite(OPTIMAL_BRIDGING_SITES[0])}
            title="Fly to Top Optimal Bridge Site"
          >
            <span>⚡ Top Site (Kargil)</span>
          </button>
        </div>

        {/* Floating QGIS Control Panel (Top Right) */}
        <div className={styles.qgisPanel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <span>🗺️ Bridge Suitability GIS</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ padding: '8px 12px 0' }}>
            <div className={styles.tabButtons}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'sites' ? styles.active : ''}`}
                onClick={() => setActiveTab('sites')}
              >
                Sites ({OPTIMAL_BRIDGING_SITES.length})
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'symbology' ? styles.active : ''}`}
                onClick={() => setActiveTab('symbology')}
              >
                Filter/Color
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'layers' ? styles.active : ''}`}
                onClick={() => setActiveTab('layers')}
              >
                Basemap
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'inspect' ? styles.active : ''}`}
                onClick={() => setActiveTab('inspect')}
              >
                Probe
              </button>
            </div>
          </div>

          <div className={styles.panelBody}>
            {/* TAB 1: OPTIMAL SITES (Quick Jump) */}
            {activeTab === 'sites' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '2px' }}>
                  Click any site below to instantly fly & inspect:
                </div>
                {OPTIMAL_BRIDGING_SITES.map((site) => (
                  <div
                    key={site.id}
                    onClick={() => handleJumpToSite(site)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.78rem', color: '#f8fafc' }}>{site.name}</strong>
                      <span style={{ background: '#1a9850', color: '#fff', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                        Class 5
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Sector: {site.sector} • {site.lat.toFixed(4)}°N, {site.lon.toFixed(4)}°E
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: SYMBOLOGY & FILTER */}
            {activeTab === 'symbology' && (
              <>
                {/* Threshold Filter */}
                <div className={styles.controlRow}>
                  <label className={styles.controlLabel}>Suitability Filter (Threshold)</label>
                  <select
                    className={styles.selectInput}
                    value={selectedThreshold}
                    onChange={(e) => setSelectedThreshold(e.target.value)}
                  >
                    {THRESHOLD_FILTERS.map((tf) => (
                      <option key={tf.id} value={tf.id}>
                        {tf.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Colormap LUT */}
                <div className={styles.controlRow}>
                  <label className={styles.controlLabel}>Color Palette</label>
                  <select
                    className={styles.selectInput}
                    value={selectedColormap}
                    onChange={(e) => setSelectedColormap(e.target.value)}
                  >
                    {COLORMAPS.map((cm) => (
                      <option key={cm.id} value={cm.id}>
                        {cm.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opacity Slider */}
                <div className={styles.controlRow}>
                  <label className={styles.controlLabel}>
                    <span>Layer Opacity</span>
                    <span>{Math.round(rasterOpacity * 100)}%</span>
                  </label>
                  <div className={styles.sliderRow}>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={rasterOpacity}
                      onChange={(e) => setRasterOpacity(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {/* Classification Legend */}
                <div className={styles.legendBox}>
                  <div className={styles.legendTitle}>Suitability Score Legend</div>
                  <div className={styles.legendBar} />
                  <div className={styles.legendLabels}>
                    <span>1: Low (Red)</span>
                    <span>3: Moderate</span>
                    <span>5: Optimal (Green)</span>
                  </div>
                </div>
              </>
            )}

            {/* TAB 3: BASEMAP */}
            {activeTab === 'layers' && (
              <>
                <div className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="rasterToggleMain"
                    checked={rasterEnabled}
                    onChange={(e) => setRasterEnabled(e.target.checked)}
                  />
                  <label htmlFor="rasterToggleMain">Bridge Suitability Raster Overlay</label>
                </div>

                <div className={styles.controlRow}>
                  <label className={styles.controlLabel}>Basemap Style</label>
                  <select
                    className={styles.selectInput}
                    value={activeBasemap}
                    onChange={(e) => setActiveBasemap(e.target.value)}
                  >
                    {BASEMAPS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* TAB 4: IDENTIFY / PROBE */}
            {activeTab === 'inspect' && (
              <div className={styles.inspectorBox}>
                <div className={styles.inspectorHeader}>
                  <span>Pixel Probe / Identify</span>
                </div>

                {inspectData && inspectData.valid && inspectData.raw_value ? (
                  <>
                    <div
                      className={styles.inspectorBadge}
                      style={{ backgroundColor: inspectData.color || '#3b82f6' }}
                    >
                      {inspectData.label} (Score {inspectData.raw_value}/5)
                    </div>
                    <div className={styles.inspectorDesc}>{inspectData.description}</div>
                    <div className={styles.inspectorCoords}>
                      Location: {inspectData.lat.toFixed(5)}°N, {inspectData.lon.toFixed(5)}°E
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    Click anywhere on the colorful map area to inspect terrain suitability at that exact pixel.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
