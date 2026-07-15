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
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    // The user selects a .png — derive the .tif counterpart for georeferencing
    const basePath = path.replace(/\.(png|tiff?)$/i, "");
    const tifPath  = `${basePath}.tif`;
    const pngPath  = `${basePath}.png`;

    // Fetch the first 64 KB of the .tif to read the bounding box
    const fileRes = await fetch(`${config.host}/api/2.0/fs/files${tifPath}`, {
        headers: {
            Authorization: `Bearer ${config.token}`,
            Range: "bytes=0-65535",
        },
    });

    if (!fileRes.ok) {
        return NextResponse.json(
            { available: false, path: null, bounds: null, existing_geojson: null }
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
    } catch {
        return NextResponse.json(
            { available: false, path: null, bounds: null, existing_geojson: null }
        );
    }
}
