"use client";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
// No static JS import of geoman here — loaded dynamically below

import {useCallback, useEffect, useRef, useState} from "react";
import L from "leaflet";

// ── Leaflet default icon fix (required in Next.js) ────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrthoInfo {
    available: boolean;
    path: string | null;
    bounds: [[number, number], [number, number]] | null;
    existing_geojson: GeoJSON.FeatureCollection | null;
}

export interface BoundaryDrawerProps {
    orthoInfoUrl: string;
    saveUrl: string;
    onSaved: () => void;
    onCancel: () => void;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const DEFAULT_STYLE = {color: "#2563eb", weight: 2, fillOpacity: 0.15};
const SELECTED_STYLE = {color: "#f59e0b", weight: 3, fillOpacity: 0.3};
const GRID_STYLE = {color: "#22c55e", weight: 1.5, fillOpacity: 0.1};

// ── Helpers ───────────────────────────────────────────────────────────────────

function layerToFeature(layer: L.Layer): GeoJSON.Feature | null {
    if (
        layer instanceof L.Polygon ||
        layer instanceof L.Polyline ||
        layer instanceof L.Rectangle ||
        layer instanceof L.Circle ||
        layer instanceof L.CircleMarker ||
        layer instanceof L.Marker
    ) {
        return (layer as unknown as { toGeoJSON(): GeoJSON.Feature }).toGeoJSON();
    }
    return null;
}

// ── Toolbar button helper ─────────────────────────────────────────────────────

function ToolbarButton({
                           onClick, disabled, active, title, children,
                       }: {
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${active
                ? "bg-gray-600 border-gray-500 text-white"
                : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
            }`}
        >
            {children}
        </button>
    );
}

// ── Grid generation helper ────────────────────────────────────────────────────

function generateGridFeatures(
    bounds: L.LatLngBounds,
    rows: number,
    cols: number,
): GeoJSON.Feature[] {
    const south = bounds.getSouth();
    const north = bounds.getNorth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    const latStep = (north - south) / rows;
    const lngStep = (east - west) / cols;

    const features: GeoJSON.Feature[] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const s = south + r * latStep;
            const n = south + (r + 1) * latStep;
            const w = west + c * lngStep;
            const e = west + (c + 1) * lngStep;

            features.push({
                type: "Feature",
                properties: {row: r + 1, col: c + 1, plot: r * cols + c + 1},
                geometry: {
                    type: "Polygon",
                    coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
                },
            });
        }
    }

    return features;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BoundaryDrawer({orthoInfoUrl, saveUrl, onSaved, onCancel}: BoundaryDrawerProps) {
    const [orthoInfo, setOrthoInfo] = useState<OrthoInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const drawnLayersRef = useRef<L.FeatureGroup | null>(null);

    const selectedLayersRef = useRef<Set<L.Layer>>(new Set());
    const [selectedCount, setSelectedCount] = useState(0);

    const isMoveModeRef = useRef(false);
    const [isMoveMode, setIsMoveMode] = useState(false);

    const historyRef = useRef<GeoJSON.Feature[][]>([[]]);
    const historyIdxRef = useRef(0);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const [featureCount, setFeatureCount] = useState(0);

    const [gridRows, setGridRows] = useState(3);
    const [gridCols, setGridCols] = useState(3);
    const [isDrawingGridBox, setIsDrawingGridBox] = useState(false);
    const gridBoxLayerRef = useRef<L.Rectangle | null>(null);

    // ── Fetch ortho info ──────────────────────────────────────────────────────────

    useEffect(() => {
        setIsLoading(true);
        fetch(orthoInfoUrl)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<OrthoInfo>;
            })
            .then(setOrthoInfo)
            .catch(() => setErrorMessage("Failed to load orthomosaic info."))
            .finally(() => setIsLoading(false));
    }, [orthoInfoUrl]);

    // ── Stable callbacks ──────────────────────────────────────────────────────────

    const pushHistory = useCallback(() => {
        const layers = drawnLayersRef.current?.getLayers() ?? [];
        const features = layers.map(layerToFeature).filter((f): f is GeoJSON.Feature => f !== null);
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push(features);
        historyIdxRef.current = historyRef.current.length - 1;
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(false);
        setFeatureCount(features.length);
    }, []);

    const exitMoveMode = useCallback(() => {
        isMoveModeRef.current = false;
        setIsMoveMode(false);
        drawnLayersRef.current?.getLayers().forEach((l: any) => {
            if (l.pm) l.pm.disableLayerDrag();
        });
    }, []);

    const addLayerListeners = useCallback((layer: L.Layer) => {
        const layerAny = layer as any;
        layer.on("click", (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (selectedLayersRef.current.has(layer)) {
                selectedLayersRef.current.delete(layer);
                layerAny.setStyle?.(DEFAULT_STYLE);
            } else {
                selectedLayersRef.current.add(layer);
                layerAny.setStyle?.(SELECTED_STYLE);
            }
            setSelectedCount(selectedLayersRef.current.size);
        });
        layerAny.on("pm:update", pushHistory);
        layerAny.on("pm:dragend", () => {
            pushHistory();
            if (isMoveModeRef.current) exitMoveMode();
        });
    }, [pushHistory, exitMoveMode]);

    const restoreFeatures = useCallback((features: GeoJSON.Feature[]) => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;
        if (isMoveModeRef.current) exitMoveMode();
        selectedLayersRef.current.clear();
        setSelectedCount(0);
        drawnLayers.clearLayers();
        if (features.length > 0) {
            L.geoJSON(
                {type: "FeatureCollection", features} as GeoJSON.FeatureCollection,
                {style: DEFAULT_STYLE},
            ).eachLayer((l) => {
                addLayerListeners(l);
                drawnLayers.addLayer(l);
            });
        }
        setFeatureCount(features.length);
    }, [addLayerListeners, exitMoveMode]);

    // ── Grid helpers ──────────────────────────────────────────────────────────────

    const startGridBoxDraw = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;
        if (gridBoxLayerRef.current) {
            gridBoxLayerRef.current.remove();
            gridBoxLayerRef.current = null;
        }
        setIsDrawingGridBox(true);
        const mapAny = map as any;
        mapAny.pm?.enableDraw("Polygon", {pathOptions: {color: "#f97316", weight: 2, fillOpacity: 0.1}});

        const onCreated = (e: any) => {
            mapAny.pm?.disableDraw();
            map.off("pm:create", onCreated);
            const rect: L.Rectangle = e.layer;
            rect.setStyle({color: "#f97316", weight: 2, dashArray: "6 4", fillOpacity: 0.05});
            rect.addTo(map);
            gridBoxLayerRef.current = rect;
            setIsDrawingGridBox(false);
        };
        map.on("pm:create", onCreated);
    }, []);

    const applyGrid = useCallback(() => {
        const map = mapRef.current;
        const drawnLayers = drawnLayersRef.current;
        const gridBox = gridBoxLayerRef.current;
        if (!map || !drawnLayers || !gridBox) return;
        const bounds = gridBox.getBounds();
        const features = generateGridFeatures(bounds, gridRows, gridCols);
        selectedLayersRef.current.clear();
        setSelectedCount(0);
        drawnLayers.clearLayers();
        L.geoJSON(
            {type: "FeatureCollection", features} as GeoJSON.FeatureCollection,
            {style: GRID_STYLE},
        ).eachLayer((l) => {
            addLayerListeners(l);
            drawnLayers.addLayer(l);
        });
        gridBox.remove();
        gridBoxLayerRef.current = null;
        pushHistory();
    }, [gridRows, gridCols, addLayerListeners, pushHistory]);

    const clearGridBox = useCallback(() => {
        if (gridBoxLayerRef.current) {
            gridBoxLayerRef.current.remove();
            gridBoxLayerRef.current = null;
        }
        setIsDrawingGridBox(false);
        (mapRef.current as any)?.pm?.disableDraw();
    }, []);

    // ── Map initialisation — Geoman loaded dynamically to avoid SSR crash ─────────

    useEffect(() => {
        if (!orthoInfo?.available || !orthoInfo.bounds || !mapContainerRef.current) return;
        if (mapRef.current) return;

        let cancelled = false;

        import("@geoman-io/leaflet-geoman-free").then(() => {
            if (cancelled || !mapContainerRef.current || mapRef.current) return;

            const bounds = L.latLngBounds(orthoInfo.bounds![0], orthoInfo.bounds![1]);
            const map = L.map(mapContainerRef.current, {
                crs: L.CRS.EPSG3857,
                center: bounds.getCenter(),
                zoom: 17,
                minZoom: 10,
                maxZoom: 22,
            });
            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
                opacity: 0.4,
            }).addTo(map);

            if (orthoInfo.path) {
                L.imageOverlay(orthoInfo.path, bounds, {opacity: 0.9}).addTo(map);
            }
            map.fitBounds(bounds);

            const drawnLayers = new L.FeatureGroup();
            drawnLayersRef.current = drawnLayers;
            drawnLayers.addTo(map);

            const initialFeatures = orthoInfo.existing_geojson?.features ?? [];
            if (initialFeatures.length > 0) {
                L.geoJSON(
                    {type: "FeatureCollection", features: initialFeatures} as GeoJSON.FeatureCollection,
                    {style: DEFAULT_STYLE},
                ).eachLayer((l) => {
                    addLayerListeners(l);
                    drawnLayers.addLayer(l);
                });
                setFeatureCount(initialFeatures.length);
            }

            historyRef.current = [initialFeatures];
            historyIdxRef.current = 0;
            setCanUndo(false);
            setCanRedo(false);

            const mapAny = map as any;
            // pm is now guaranteed to exist because Geoman was imported above
            mapAny.pm.addControls({
                position: "topleft",
                drawMarker: false,
                drawCircleMarker: false,
                drawPolyline: false,
                drawCircle: false,
                drawText: false,
                drawPolygon: true,
                drawRectangle: true,
                editMode: true,
                dragMode: false,
                cutPolygon: false,
                removalMode: true,
                rotateMode: false,
            });
            mapAny.pm.setGlobalOptions({layerGroup: drawnLayers, pathOptions: DEFAULT_STYLE});

            map.on("pm:create", (e: any) => {
                if (e.layer) addLayerListeners(e.layer);
                pushHistory();
            });
            map.on("pm:remove", (e: any) => {
                if (e.layer) {
                    selectedLayersRef.current.delete(e.layer);
                    setSelectedCount(selectedLayersRef.current.size);
                }
                pushHistory();
            });
            map.on("click", () => {
                selectedLayersRef.current.forEach((l: any) => l.setStyle?.(DEFAULT_STYLE));
                selectedLayersRef.current.clear();
                setSelectedCount(0);
                if (isMoveModeRef.current) exitMoveMode();
            });
        });

        return () => {
            cancelled = true;
            const map = mapRef.current;
            mapRef.current = null;
            map?.remove();
        };
    }, [orthoInfo, addLayerListeners, pushHistory, exitMoveMode]);

    // ── Undo / Redo ───────────────────────────────────────────────────────────────

    const handleUndo = () => {
        if (historyIdxRef.current <= 0) return;
        historyIdxRef.current--;
        restoreFeatures(historyRef.current[historyIdxRef.current]);
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(true);
    };

    const handleRedo = () => {
        if (historyIdxRef.current >= historyRef.current.length - 1) return;
        historyIdxRef.current++;
        restoreFeatures(historyRef.current[historyIdxRef.current]);
        setCanUndo(true);
        setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    };

    // ── Delete selected ───────────────────────────────────────────────────────────

    const handleDeleteSelected = () => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;
        selectedLayersRef.current.forEach((l) => drawnLayers.removeLayer(l));
        selectedLayersRef.current.clear();
        setSelectedCount(0);
        pushHistory();
    };

    // ── Save ──────────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        const layers = drawnLayersRef.current?.getLayers() ?? [];
        const features = layers.map(layerToFeature).filter((f): f is GeoJSON.Feature => f !== null);
        if (features.length === 0) return;
        setIsSaving(true);
        try {
            const res = await fetch(saveUrl, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    type: "FeatureCollection",
                    features,
                    targetPath: new URL(saveUrl, window.location.origin).searchParams.get("path"),
                }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onSaved();
        } catch (e) {
            setErrorMessage(`Save failed: ${(e as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────────

    if (isLoading) return <p className="text-gray-400 text-sm">Loading orthomosaic info…</p>;

    if (!orthoInfo?.available) {
        return (
            <p className="text-yellow-400 text-sm">
                No mosaic found. Complete the preceding processing steps first.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}

            {/* ── Grid Generator Panel ──────────────────────────────────────────────── */}
            <div className="bg-gray-700 rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-white text-sm font-semibold">Grid Generator</h3>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-gray-300">
                        Rows
                        <input
                            type="number" min={1} max={100} value={gridRows}
                            onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-gray-300">
                        Columns
                        <input
                            type="number" min={1} max={100} value={gridCols}
                            onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                        />
                    </label>
                    <ToolbarButton onClick={startGridBoxDraw} active={isDrawingGridBox}
                                   title="Draw a rectangle on the map to define the grid area">
                        {isDrawingGridBox ? "Drawing… (click map)" : "1. Draw Grid Area"}
                    </ToolbarButton>
                    <ToolbarButton onClick={applyGrid} disabled={!gridBoxLayerRef.current}
                                   title="Subdivide the drawn area into a grid of plots">
                        2. Apply Grid
                    </ToolbarButton>
                    {gridBoxLayerRef.current && (
                        <ToolbarButton onClick={clearGridBox} title="Cancel grid area">Clear Area</ToolbarButton>
                    )}
                </div>
                <p className="text-xs text-gray-400">
                    Draw a rectangle over the field, set rows &amp; columns, then click Apply Grid.
                    This will replace any existing plots with {gridRows * gridCols} new cells.
                </p>
            </div>

            {/* ── Main toolbar ──────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 items-center">
                <ToolbarButton onClick={handleUndo} disabled={!canUndo}>↩ Undo</ToolbarButton>
                <ToolbarButton onClick={handleRedo} disabled={!canRedo}>↪ Redo</ToolbarButton>
                <ToolbarButton onClick={handleDeleteSelected} disabled={selectedCount === 0}>
                    🗑 Delete ({selectedCount})
                </ToolbarButton>
                <span className="ml-auto text-xs text-gray-400">
                    {featureCount} plot{featureCount !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Map ───────────────────────────────────────────────────────────────── */}
            <div ref={mapContainerRef} className="w-full rounded-xl" style={{height: 520}}/>

            {/* ── Footer actions ────────────────────────────────────────────────────── */}
            <div className="flex gap-3 justify-end">
                <ToolbarButton onClick={onCancel}>Cancel</ToolbarButton>
                <ToolbarButton onClick={handleSave} disabled={isSaving || featureCount === 0} active={isSaving}>
                    {isSaving ? "Saving…" : `Save ${featureCount} Plot${featureCount !== 1 ? "s" : ""}`}
                </ToolbarButton>
            </div>
        </div>
    );
}