import { NextRequest, NextResponse } from "next/server";
import { getDatabricksConfig } from "../../upload/databricks/client";
import { fromArrayBuffer } from "geotiff";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
        return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
    }

    let config;
    try {
        config = await getDatabricksConfig();
    } catch (e) {
        console.error("Failed to get Databricks config:", e);
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    const basePath = path.replace(/\.(png|tiff?)$/i, "");
    const tifPath  = `${basePath}.tif`;
    const pngPath  = `${basePath}.png`;

    // Fetch the first 128 KB of the .tif to read the bounding box. This is safer for
    // files where the metadata is not at the very beginning.
    const fileRes = await fetch(`${config.host}/api/2.0/fs/files${tifPath}`, {
        headers: {
            Authorization: `Bearer ${config.token}`,
            Range: "bytes=0-131071", // Increased from 64KB to 128KB
        },
    });

    if (!fileRes.ok) {
        const errorText = await fileRes.text();
        console.error(`Failed to fetch TIF file: ${tifPath}. Status: ${fileRes.status}. Response: ${errorText}`);
        return NextResponse.json(
            {
                available: false,
                path: null,
                bounds: null,
                existing_geojson: null,
                debug_error: `Failed to fetch TIF. Status: ${fileRes.status}.`,
            }
        );
    }

    try {
        const arrayBuffer = await fileRes.arrayBuffer();
        const tiff = await fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();
        const [west, south, east, north] = image.getBoundingBox();

        return NextResponse.json({
            available: true,
            path: `/api/drone/ortho-png?path=${encodeURIComponent(pngPath)}`,
            bounds: [[south, west], [north, east]],
            existing_geojson: null,
        });
    } catch (e) {
        console.error(`Failed to parse GeoTIFF file: ${tifPath}. Error:`, e);
        return NextResponse.json(
            {
                available: false,
                path: null,
                bounds: null,
                existing_geojson: null,
                debug_error: `GeoTIFF parsing failed: ${(e as Error).message}`,
            }
        );
    }
}