"use client";

// No top-level Leaflet import — loaded entirely dynamically to prevent SSR crash
import { useEffect, useRef, useState } from "react";
import "@/packages/styles/base.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrthoInfo {
    available: boolean;
    path: string | null;
    bounds: [[number, number], [number, number]] | null;
    existing_geojson: GeoJSON.FeatureCollection | null;
    debug_error?: string; // Optional field for backend error details
}

export interface FieldDrawerProps {
    orthoInfoUrl: string;
    saveUrl: string;
    onSaved: () => void;
    onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FieldDrawer({ orthoInfoUrl, saveUrl, onSaved, onCancel }: FieldDrawerProps) {
    const [orthoInfo, setOrthoInfo] = useState<OrthoInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const drawnLayersRef = useRef<any>(null);

    // ── Fetch Ortho Info ────────────────────────────────────────────────────────

    useEffect(() => {
        setIsLoading(true);
        fetch(orthoInfoUrl)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<OrthoInfo>;
            })
            .then((info) => {
                setOrthoInfo(info);
                if (!info.available) {
                    const baseMessage = "No mosaic found. Complete the preceding processing steps first.";
                    const detail = info.debug_error ? `(${info.debug_error})` : "";
                    setErrorMessage(`${baseMessage} ${detail}`);
                }
            })
            .catch((e) => {
                setErrorMessage(`Failed to load orthomosaic info: ${(e as Error).message}`);
            })
            .finally(() => setIsLoading(false));
    }, [orthoInfoUrl]);

    // ── Map & Geoman Initialization ─────────────────────────────────────────────

    useEffect(() => {
        // Don't run if the mosaic isn't available or the map is already initialized
        if (!orthoInfo?.available || !orthoInfo.bounds || !mapContainerRef.current || mapRef.current) {
            return;
        }

        // Capture into local consts before the async boundary
        const orthoBounds = orthoInfo.bounds;
        const orthoPath = orthoInfo.path;
        const existingGeoJson = orthoInfo.existing_geojson;

        let cancelled = false;

        // Load Leaflet, CSS and Geoman all dynamically
        Promise.all([
            import("leaflet"),
            import("leaflet/dist/leaflet.css"),
            import("@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"),
            import("@geoman-io/leaflet-geoman-free"),
        ]).then(([L]) => {
            if (cancelled || !mapContainerRef.current || mapRef.current) return;

            // Fix Leaflet default icons
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const bounds = L.latLngBounds(orthoBounds[0], orthoBounds[1]);
            const map = L.map(mapContainerRef.current, {
                crs: L.CRS.EPSG3857,
                center: bounds.getCenter(),
                zoom: 17,
                minZoom: 10,
                maxZoom: 22,
            });
            mapRef.current = map;

            // Base Layer
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
                opacity: 0.5,
            }).addTo(map);

            // Add Orthomosaic Image if exists
            if (orthoPath) {
                L.imageOverlay(orthoPath, bounds, { opacity: 0.9 }).addTo(map);
            }
            map.fitBounds(bounds);

            // Setup Layer Group for drawn polygons
            const drawnLayers = new L.FeatureGroup();
            drawnLayersRef.current = drawnLayers;
            drawnLayers.addTo(map);

            // Load existing boundaries if any
            if (existingGeoJson?.features) {
                L.geoJSON(
                    existingGeoJson as GeoJSON.FeatureCollection,
                    { style: { color: "#2563eb", weight: 2, fillOpacity: 0.2 } }
                ).eachLayer((layer) => {
                    drawnLayers.addLayer(layer);
                });
            }

            // Initialize Geoman Controls
            map.pm.addControls({
                position: "topleft",
                drawPolygon: true,
                drawRectangle: true,
                editMode: true,
                removalMode: true,
            });

            // Listen for new shapes being drawn
            map.on("pm:create", (e: any) => {
                drawnLayers.addLayer(e.layer);
            });

            // Listen for removals
            map.on("pm:remove", (e: any) => {
                if (e.layer) drawnLayers.removeLayer(e.layer);
            });
        });

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [orthoInfo]);

    // ── Save Logic ──────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!drawnLayersRef.current) return;

        const layers = drawnLayersRef.current.getLayers();
        const features = layers
            .map((layer: any) => layer.toGeoJSON())
            .filter((f: any) => f !== null);

        if (features.length === 0) {
            setErrorMessage("Please draw at least one polygon before saving.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await fetch(saveUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "FeatureCollection",
                    features,
                    targetPath: new URL(saveUrl, window.location.origin).searchParams.get("path"),
                }),
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            onSaved();
        } catch (e) {
            setErrorMessage(`Save failed: ${(e as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────────

    if (isLoading) return <p className="text-gray-400">Loading map data...</p>;

    // If there's an error, don't render the map container
    if (errorMessage) {
        return <p className="text-red-500 text-sm">{errorMessage}</p>;
    }

    return (
        <div>
            <div
                ref={mapContainerRef}
                className="map-container"
            />

            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="cancel-button"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="save-button"
                >
                    {isSaving ? "Saving..." : "Save Boundary"}
                </button>
            </div>
        </div>
    );
}