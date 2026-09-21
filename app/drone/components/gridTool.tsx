"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

const DEFAULT_STYLE = { color: "#2563eb", weight: 2, fillOpacity: 0.15 };
const SELECTED_STYLE = { color: "#f59e0b", weight: 3, fillOpacity: 0.3 };
const GRID_STYLE = { color: "#22c55e", weight: 1.5, fillOpacity: 0.1 };
const BOUNDARY_STYLE = { color: "#f97316", weight: 2, fillOpacity: 0.1 };
const MABR_STYLE = { color: "#8b5cf6", weight: 2, dashArray: "6 4", fillOpacity: 0.05 };
const EDITING_STYLE = { color: "#3b82f6", weight: 2, fillOpacity: 0.2 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function layerToFeature(layer: any): GeoJSON.Feature | null {
    if (typeof layer.toGeoJSON === "function") {
        return layer.toGeoJSON() as GeoJSON.Feature;
    }
    return null;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

type Point = [number, number];

function rotatePoint(cx: number, cy: number, x: number, y: number, angleDeg: number): Point {
    const angleRad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return [
        cos * (x - cx) - sin * (y - cy) + cx,
        sin * (x - cx) + cos * (y - cy) + cy,
    ];
}

function rotatePoints(points: Point[], center: Point, angleDeg: number): Point[] {
    return points.map(([x, y]) => rotatePoint(center[0], center[1], x, y, angleDeg));
}

function getCenter(points: Point[]): Point {
    const sum = points.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
}

function getBoundingBox(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number; area: number } {
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { minX, maxX, minY, maxY, area: (maxX - minX) * (maxY - minY) };
}

// ── Convex Hull (Graham Scan) ─────────────────────────────────────────────────

function cross(o: Point, a: Point, b: Point): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function convexHull(points: Point[]): Point[] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length <= 1) return sorted;

    const lower: Point[] = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper: Point[] = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        const p = sorted[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

// ── Minimum Area Bounding Rectangle ───────────────────────────────────────────

interface MABR {
    corners: Point[];
    center: Point;
    width: number;
    height: number;
    rotation: number;
}

function computeMABR(polygonCoords: Point[]): MABR {
    const points = polygonCoords[0][0] === polygonCoords[polygonCoords.length - 1][0] &&
    polygonCoords[0][1] === polygonCoords[polygonCoords.length - 1][1]
        ? polygonCoords.slice(0, -1)
        : polygonCoords;

    const hull = convexHull(points);
    if (hull.length < 3) {
        const bbox = getBoundingBox(points);
        const center: Point = [(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2];
        return {
            corners: [
                [bbox.minX, bbox.minY],
                [bbox.maxX, bbox.minY],
                [bbox.maxX, bbox.maxY],
                [bbox.minX, bbox.maxY],
            ],
            center,
            width: bbox.maxX - bbox.minX,
            height: bbox.maxY - bbox.minY,
            rotation: 0,
        };
    }

    const hullCenter = getCenter(hull);
    let bestRotation = 0;
    let bestArea = Infinity;
    let bestBbox = getBoundingBox(hull);

    for (let i = 0; i < hull.length; i++) {
        const p1 = hull[i];
        const p2 = hull[(i + 1) % hull.length];
        const edgeAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI);
        const rotated = rotatePoints(hull, hullCenter, -edgeAngle);
        const bbox = getBoundingBox(rotated);

        if (bbox.area < bestArea) {
            bestArea = bbox.area;
            bestRotation = edgeAngle;
            bestBbox = bbox;
        }
    }

    const rectCorners: Point[] = [
        [bestBbox.minX, bestBbox.minY],
        [bestBbox.maxX, bestBbox.minY],
        [bestBbox.maxX, bestBbox.maxY],
        [bestBbox.minX, bestBbox.maxY],
    ];

    const finalCorners = rotatePoints(rectCorners, hullCenter, bestRotation);

    return {
        corners: finalCorners,
        center: hullCenter,
        width: bestBbox.maxX - bestBbox.minX,
        height: bestBbox.maxY - bestBbox.minY,
        rotation: bestRotation,
    };
}

// ── Grid generation from MABR ─────────────────────────────────────────────────

function generateGridFromMABR(mabr: MABR, rows: number, cols: number): GeoJSON.Feature[] {
    const { center, width, height, rotation } = mabr;
    const halfW = width / 2;
    const halfH = height / 2;
    const cellW = width / cols;
    const cellH = height / rows;
    const features: GeoJSON.Feature[] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x0 = -halfW + c * cellW;
            const x1 = -halfW + (c + 1) * cellW;
            const y0 = -halfH + r * cellH;
            const y1 = -halfH + (r + 1) * cellH;

            const cellCorners: Point[] = [
                [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]
            ];

            const finalCorners = cellCorners.map(([x, y]) => {
                const rotated = rotatePoint(0, 0, x, y, rotation);
                return [rotated[0] + center[0], rotated[1] + center[1]] as Point;
            });

            features.push({
                type: "Feature",
                properties: { row: r + 1, col: c + 1, plot: r * cols + c + 1 },
                geometry: {
                    type: "Polygon",
                    coordinates: [finalCorners],
                },
            });
        }
    }

    return features;
}

function mabrToPolygon(mabr: MABR): GeoJSON.Feature {
    const closedCorners = [...mabr.corners, mabr.corners[0]];
    return {
        type: "Feature",
        properties: { type: "mabr" },
        geometry: {
            type: "Polygon",
            coordinates: [closedCorners],
        },
    };
}

// ── Toolbar button helper ─────────────────────────────────────────────────────

function ToolbarButton({
                           onClick, disabled, active, title, children, variant = "default",
                       }: {
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
    variant?: "default" | "primary" | "danger";
}) {
    const baseClasses = "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    let variantClasses = "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700";
    if (active) {
        variantClasses = "bg-blue-600 border-blue-500 text-white";
    } else if (variant === "primary") {
        variantClasses = "bg-green-700 border-green-600 text-white hover:bg-green-600";
    } else if (variant === "danger") {
        variantClasses = "bg-red-800 border-red-700 text-white hover:bg-red-700";
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`${baseClasses} ${variantClasses}`}
        >
            {children}
        </button>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BoundaryDrawer({ orthoInfoUrl, saveUrl, onSaved, onCancel }: BoundaryDrawerProps) {
    const [orthoInfo, setOrthoInfo] = useState<OrthoInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const drawnLayersRef = useRef<any>(null);
    const LRef = useRef<any>(null);

    const selectedLayersRef = useRef<Set<any>>(new Set());
    const [selectedCount, setSelectedCount] = useState(0);

    // Edit modes
    const [isEditMode, setIsEditMode] = useState(false);
    const [isMoveMode, setIsMoveMode] = useState(false);
    const [isRotateMode, setIsRotateMode] = useState(false);

    const historyRef = useRef<GeoJSON.Feature[][]>([[]]);
    const historyIdxRef = useRef(0);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const [featureCount, setFeatureCount] = useState(0);

    // Grid generator state
    const [gridRows, setGridRows] = useState(3);
    const [gridCols, setGridCols] = useState(3);
    const [isDrawingBoundary, setIsDrawingBoundary] = useState(false);
    const [mabr, setMabr] = useState<MABR | null>(null);
    const [rotationOffset, setRotationOffset] = useState(0);

    const drawnBoundaryRef = useRef<any>(null);
    const mabrLayerRef = useRef<any>(null);

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
        const features = layers.map(layerToFeature).filter((f: any): f is GeoJSON.Feature => f !== null);
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push(features);
        historyIdxRef.current = historyRef.current.length - 1;
        setCanUndo(historyIdxRef.current > 0);
        setCanRedo(false);
        setFeatureCount(features.length);
    }, []);

    const exitAllModes = useCallback(() => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;

        drawnLayers.getLayers().forEach((l: any) => {
            if (l.pm) {
                l.pm.disable();
                l.pm.disableLayerDrag();
                l.pm.disableRotate();
            }
            l.setStyle?.(DEFAULT_STYLE);
        });

        setIsEditMode(false);
        setIsMoveMode(false);
        setIsRotateMode(false);
    }, []);

    const addLayerListeners = useCallback((layer: any) => {
        layer.on("click", (e: any) => {
            const L = LRef.current;
            if (L) L.DomEvent.stopPropagation(e);

            // Toggle selection
            if (selectedLayersRef.current.has(layer)) {
                selectedLayersRef.current.delete(layer);
                layer.setStyle?.(DEFAULT_STYLE);
                // Disable editing on deselect
                if (layer.pm) {
                    layer.pm.disable();
                    layer.pm.disableLayerDrag();
                    layer.pm.disableRotate();
                }
            } else {
                selectedLayersRef.current.add(layer);
                layer.setStyle?.(SELECTED_STYLE);
            }
            setSelectedCount(selectedLayersRef.current.size);
        });

        layer.on("pm:edit", pushHistory);
        layer.on("pm:dragend", pushHistory);
        layer.on("pm:rotateend", pushHistory);
    }, [pushHistory]);

    const restoreFeatures = useCallback((features: GeoJSON.Feature[]) => {
        const L = LRef.current;
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers || !L) return;

        exitAllModes();
        selectedLayersRef.current.clear();
        setSelectedCount(0);
        drawnLayers.clearLayers();

        if (features.length > 0) {
            L.geoJSON(
                { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
                { style: DEFAULT_STYLE },
            ).eachLayer((l: any) => {
                addLayerListeners(l);
                drawnLayers.addLayer(l);
            });
        }
        setFeatureCount(features.length);
    }, [addLayerListeners, exitAllModes]);

    // ── Edit mode (resize corners) ────────────────────────────────────────────────

    const toggleEditMode = useCallback(() => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;

        if (isEditMode) {
            // Exit edit mode
            drawnLayers.getLayers().forEach((l: any) => {
                if (l.pm) l.pm.disable();
            });
            setIsEditMode(false);
        } else {
            // Exit other modes first
            if (isMoveMode) {
                drawnLayers.getLayers().forEach((l: any) => {
                    if (l.pm) l.pm.disableLayerDrag();
                });
                setIsMoveMode(false);
            }
            if (isRotateMode) {
                drawnLayers.getLayers().forEach((l: any) => {
                    if (l.pm) l.pm.disableRotate();
                });
                setIsRotateMode(false);
            }

            // Enable edit mode on selected layers (or all if none selected)
            const layersToEdit = selectedLayersRef.current.size > 0
                ? Array.from(selectedLayersRef.current)
                : drawnLayers.getLayers();

            layersToEdit.forEach((l: any) => {
                if (l.pm) {
                    l.pm.enable({
                        allowSelfIntersection: false,
                        preventMarkerRemoval: true, // Keep 4 corners
                    });
                }
                l.setStyle?.(EDITING_STYLE);
            });
            setIsEditMode(true);
        }
    }, [isEditMode, isMoveMode, isRotateMode]);

    // ── Move mode (drag entire polygon) ───────────────────────────────────────────
    const toggleMoveMode = useCallback(() => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;

        if (isMoveMode) {
            // Exit move mode
            drawnLayers.getLayers().forEach((l: any) => {
                if (l.pm) l.pm.disableLayerDrag();
            });
            setIsMoveMode(false);
        } else {
            // Exit other modes first
            if (isEditMode) {
                drawnLayers.getLayers().forEach((l: any) => {
                    if (l.pm) l.pm.disable();
                });
                setIsEditMode(false);
            }
            if (isRotateMode) {
                drawnLayers.getLayers().forEach((l: any) => {
                    if (l.pm) l.pm.disableRotate();
                });
                setIsRotateMode(false);
            }

            // Enable drag on selected layers (or all if none selected)
            const layersToMove = selectedLayersRef.current.size > 0
                ? Array.from(selectedLayersRef.current)
                : drawnLayers.getLayers();

            layersToMove.forEach((l: any) => {
                if (l.pm) l.pm.enableLayerDrag();
                l.setStyle?.(EDITING_STYLE);
            });
            setIsMoveMode(true);
        }
    }, [isMoveMode, isEditMode, isRotateMode]);

    // ── Rotate mode ───────────────────────────────────────────────────────────────
    const toggleRotateMode = useCallback(() => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;

        if (isRotateMode) {
            drawnLayers.getLayers().forEach((l: any) => {
                if (l.pm) l.pm.disableRotate();
            });
            setIsRotateMode(false);
        } else {
            // Exit other modes
            if (isEditMode) {
                drawnLayers.getLayers().forEach((l: any) => {
                    if (l.pm) l.pm.disable();
                });
                setIsEditMode(false);
            }
            if (isMoveMode) {
                drawnLayers.getLayers().forEach((l: any) => {
                    if (l.pm) l.pm.disableLayerDrag();
                });
                setIsMoveMode(false);
            }

            const layersToRotate = selectedLayersRef.current.size > 0
                ? Array.from(selectedLayersRef.current)
                : drawnLayers.getLayers();

            layersToRotate.forEach((l: any) => {
                if (l.pm) l.pm.enableRotate();
                l.setStyle?.(EDITING_STYLE);
            });
            setIsRotateMode(true);
        }
    }, [isRotateMode, isEditMode, isMoveMode]);

    // ── Select All / Deselect All ─────────────────────────────────────────────────

    const selectAll = useCallback(() => {
        const drawnLayers = drawnLayersRef.current;
        if (!drawnLayers) return;

        drawnLayers.getLayers().forEach((l: any) => {
            selectedLayersRef.current.add(l);
            l.setStyle?.(SELECTED_STYLE);
        });
        setSelectedCount(selectedLayersRef.current.size);
    }, []);

    const deselectAll = useCallback(() => {
        selectedLayersRef.current.forEach((l: any) => {
            l.setStyle?.(DEFAULT_STYLE);
            if (l.pm) {
                l.pm.disable();
                l.pm.disableLayerDrag();
                l.pm.disableRotate();
            }
        });
        selectedLayersRef.current.clear();
        setSelectedCount(0);
        setIsEditMode(false);
        setIsMoveMode(false);
        setIsRotateMode(false);
    }, []);

    // ── Update MABR preview ───────────────────────────────────────────────────────

    const updateMabrPreview = useCallback((baseMabr: MABR, offset: number) => {
        const L = LRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        if (mabrLayerRef.current) {
            mabrLayerRef.current.remove();
            mabrLayerRef.current = null;
        }

        const adjustedMabr: MABR = {
            ...baseMabr,
            rotation: baseMabr.rotation + offset,
            corners: rotatePoints(
                baseMabr.corners.map(c => rotatePoint(baseMabr.center[0], baseMabr.center[1], c[0], c[1], -baseMabr.rotation)),
                baseMabr.center,
                baseMabr.rotation + offset
            ),
        };

        const mabrGeoJson = mabrToPolygon(adjustedMabr);
        const mabrLayer = L.geoJSON(mabrGeoJson, { style: MABR_STYLE }).addTo(map);
        mabrLayerRef.current = mabrLayer;
    }, []);

    // ── Grid boundary helpers ─────────────────────────────────────────────────────

    const startBoundaryDraw = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        if (drawnBoundaryRef.current) {
            drawnBoundaryRef.current.remove();
            drawnBoundaryRef.current = null;
        }
        if (mabrLayerRef.current) {
            mabrLayerRef.current.remove();
            mabrLayerRef.current = null;
        }
        setMabr(null);
        setRotationOffset(0);
        exitAllModes();

        setIsDrawingBoundary(true);
        map.pm?.enableDraw("Polygon", {
            pathOptions: BOUNDARY_STYLE,
            snappable: true,
        });

        const onCreated = (e: any) => {
            map.pm?.disableDraw();
            map.off("pm:create", onCreated);

            const polygon = e.layer;
            polygon.setStyle(BOUNDARY_STYLE);
            polygon.addTo(map);
            drawnBoundaryRef.current = polygon;

            const geoJson = polygon.toGeoJSON();
            const coords = geoJson.geometry.coordinates[0] as Point[];
            const computedMabr = computeMABR(coords);
            setMabr(computedMabr);
            setRotationOffset(0);

            const mabrGeoJson = mabrToPolygon(computedMabr);
            const mabrLayer = LRef.current.geoJSON(mabrGeoJson, { style: MABR_STYLE }).addTo(map);
            mabrLayerRef.current = mabrLayer;

            setIsDrawingBoundary(false);
        };
        map.on("pm:create", onCreated);
    }, [exitAllModes]);

    const handleRotationOffsetChange = useCallback((offset: number) => {
        setRotationOffset(offset);
        if (mabr) {
            updateMabrPreview(mabr, offset);
        }
    }, [mabr, updateMabrPreview]);

    const applyGrid = useCallback(() => {
        const L = LRef.current;
        const map = mapRef.current;
        const drawnLayers = drawnLayersRef.current;
        if (!map || !drawnLayers || !L || !mabr) return;

        const adjustedMabr: MABR = {
            ...mabr,
            rotation: mabr.rotation + rotationOffset,
        };

        const features = generateGridFromMABR(adjustedMabr, gridRows, gridCols);

        selectedLayersRef.current.clear();
        setSelectedCount(0);
        drawnLayers.clearLayers();

        L.geoJSON(
            { type: "FeatureCollection", features } as GeoJSON.FeatureCollection,
            { style: GRID_STYLE },
        ).eachLayer((l: any) => {
            addLayerListeners(l);
            drawnLayers.addLayer(l);
        });

        if (drawnBoundaryRef.current) {
            drawnBoundaryRef.current.remove();
            drawnBoundaryRef.current = null;
        }
        if (mabrLayerRef.current) {
            mabrLayerRef.current.remove();
            mabrLayerRef.current = null;
        }
        setMabr(null);
        setRotationOffset(0);
        pushHistory();
    }, [mabr, rotationOffset, gridRows, gridCols, addLayerListeners, pushHistory]);

    const clearBoundary = useCallback(() => {
        if (drawnBoundaryRef.current) {
            drawnBoundaryRef.current.remove();
            drawnBoundaryRef.current = null;
        }
        if (mabrLayerRef.current) {
            mabrLayerRef.current.remove();
            mabrLayerRef.current = null;
        }
        setMabr(null);
        setRotationOffset(0);
        setIsDrawingBoundary(false);
        mapRef.current?.pm?.disableDraw();
    }, []);

    // ── Map initialisation ────────────────────────────────────────────────────────

    useEffect(() => {
        if (!orthoInfo?.available || !orthoInfo.bounds || !mapContainerRef.current) return;
        if (mapRef.current) return;

        const orthoBounds = orthoInfo.bounds;
        const orthoPath = orthoInfo.path;
        const existingGeoJson = orthoInfo.existing_geojson;

        let cancelled = false;

        Promise.all([
            import("leaflet"),
            import("leaflet/dist/leaflet.css"),
            import("@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css"),
            import("@geoman-io/leaflet-geoman-free"),
        ]).then(([L]) => {
            if (cancelled || !mapContainerRef.current || mapRef.current) return;

            LRef.current = L;

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

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
                opacity: 0.4,
            }).addTo(map);

            if (orthoPath) {
                L.imageOverlay(orthoPath, bounds, { opacity: 0.9 }).addTo(map);
            }
            map.fitBounds(bounds);

            const drawnLayers = new L.FeatureGroup();
            drawnLayersRef.current = drawnLayers;
            drawnLayers.addTo(map);

            const initialFeatures = existingGeoJson?.features ?? [];
            if (initialFeatures.length > 0) {
                L.geoJSON(
                    { type: "FeatureCollection", features: initialFeatures } as GeoJSON.FeatureCollection,
                    { style: DEFAULT_STYLE },
                ).eachLayer((l: any) => {
                    addLayerListeners(l);
                    drawnLayers.addLayer(l);
                });
                setFeatureCount(initialFeatures.length);
            }

            historyRef.current = [initialFeatures];
            historyIdxRef.current = 0;
            setCanUndo(false);
            setCanRedo(false);

            // Minimal controls - we provide our own toolbar
            map.pm.addControls({
                position: "topleft",
                drawMarker: false,
                drawCircleMarker: false,
                drawPolyline: false,
                drawCircle: false,
                drawText: false,
                drawPolygon: false,
                drawRectangle: false,
                editMode: false,
                dragMode: false,
                cutPolygon: false,
                removalMode: false,
                rotateMode: false,
            });
            map.pm.setGlobalOptions({ layerGroup: drawnLayers, pathOptions: DEFAULT_STYLE });

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
                // Clicking on map deselects all
                deselectAll();
            });
        });

        return () => {
            cancelled = true;
            const map = mapRef.current;
            mapRef.current = null;
            map?.remove();
        };
    }, [orthoInfo, addLayerListeners, pushHistory, deselectAll]);

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
        exitAllModes();
        selectedLayersRef.current.forEach((l) => drawnLayers.removeLayer(l));
        selectedLayersRef.current.clear();
        setSelectedCount(0);
        pushHistory();
    };

    // ── Save ──────────────────────────────────────────────────────────────────────

    const handleSave = async () => {
        exitAllModes();
        const layers = drawnLayersRef.current?.getLayers() ?? [];
        const features = layers.map(layerToFeature).filter((f: any): f is GeoJSON.Feature => f !== null);
        if (features.length === 0) return;
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

    const activeMode = isEditMode ? "edit" : isMoveMode ? "move" : isRotateMode ? "rotate" : null;

    return (
        <div>
            {errorMessage && <p className="text-red-400 text-sm">{errorMessage}</p>}

            {/* ── Grid Generator Panel ──────────────────────────────────────────────── */}
            <div className="card">
                <h3 className="text-white text-sm font-semibold">Grid Generator</h3>

                <div className="flex flex-wrap items-end gap-3">
                    <ToolbarButton
                        onClick={startBoundaryDraw}
                        active={isDrawingBoundary}
                        disabled={!!mabr}
                        title="Draw a polygon around the field area"
                    >
                        {isDrawingBoundary ? "Drawing… (click map)" : "1. Draw Field Boundary"}
                    </ToolbarButton>

                    {mabr && (
                        <ToolbarButton onClick={clearBoundary} title="Clear and start over">
                            ✕ Clear
                        </ToolbarButton>
                    )}
                </div>

                {mabr && (
                    <>
                        <div className="pt-2 border-t border-gray-600">
                            <p className="text-xs text-gray-300 mb-2">
                                <span className="text-purple-400">Purple dashed line</span> = Minimum bounding rectangle (auto-detected rotation: {mabr.rotation.toFixed(1)}°)
                            </p>
                        </div>

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
                            <label className="flex flex-col gap-1 text-xs text-gray-300">
                                Adjust Rotation (°)
                                <input
                                    type="number" min={-90} max={90} step={0.5} value={rotationOffset}
                                    onChange={(e) => handleRotationOffsetChange(parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-white text-sm"
                                />
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <ToolbarButton onClick={applyGrid} variant="primary">
                                2. Apply Grid ({gridRows * gridCols} plots)
                            </ToolbarButton>
                            <span className="text-xs text-gray-400">
                                Final rotation: {(mabr.rotation + rotationOffset).toFixed(1)}°
                            </span>
                        </div>
                    </>
                )}

                <p className="text-xs text-gray-400">
                    {!mabr
                        ? "Draw a polygon around the field. A minimum bounding rectangle will be computed automatically."
                        : "Adjust rows, columns, and rotation if needed, then click 'Apply Grid'."
                    }
                </p>
            </div>

            {/* ── Plot Editing Toolbar ──────────────────────────────────────────────── */}
            {featureCount > 0 && (
                <div className="bg-gray-700 rounded-xl p-4 flex flex-col gap-3">
                    <h3 className="text-white text-sm font-semibold">Edit Plots</h3>

                    {/* Selection controls */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <ToolbarButton onClick={selectAll} title="Select all plots">
                            ☑ Select All
                        </ToolbarButton>
                        <ToolbarButton onClick={deselectAll} disabled={selectedCount === 0} title="Deselect all">
                            ☐ Deselect
                        </ToolbarButton>
                        <span className="text-xs text-gray-400 ml-2">
                            {selectedCount} of {featureCount} selected
                        </span>
                    </div>

                    {/* Edit mode controls */}
                    <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-600">
                        <ToolbarButton
                            onClick={toggleEditMode}
                            active={isEditMode}
                            title="Resize plots by dragging corners"
                        >
                            ✏️ Edit Corners
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={toggleMoveMode}
                            active={isMoveMode}
                            title="Move plots by dragging"
                        >
                            ✥ Move
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={toggleRotateMode}
                            active={isRotateMode}
                            title="Rotate plots by dragging rotation handle"
                        >
                            🔄 Rotate
                        </ToolbarButton>
                        <ToolbarButton
                            onClick={handleDeleteSelected}
                            disabled={selectedCount === 0}
                            variant="danger"
                            title="Delete selected plots"
                        >
                            🗑 Delete
                        </ToolbarButton>
                    </div>

                    {activeMode && (
                        <p className="text-xs text-blue-400">
                            {activeMode === "edit" && "Click and drag the corner markers to resize plots. Click the plot again to deselect."}
                            {activeMode === "move" && "Drag plots to move them. Changes are saved when you release."}
                            {activeMode === "rotate" && "Drag the rotation handle to rotate plots."}
                        </p>
                    )}

                    <p className="text-xs text-gray-400">
                        Click plots to select them, then use the tools above. Or use tools directly to affect all plots.
                    </p>
                </div>
            )}

            {/* ── History toolbar ───────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 items-center">
                <ToolbarButton onClick={handleUndo} disabled={!canUndo}>↩ Undo</ToolbarButton>
                <ToolbarButton onClick={handleRedo} disabled={!canRedo}>↪ Redo</ToolbarButton>
                <span className="ml-auto text-xs text-gray-400">
                    {featureCount} plot{featureCount !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Map ───────────────────────────────────────────────────────────────── */}
            <div ref={mapContainerRef}
                 className="map-container"
            />

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