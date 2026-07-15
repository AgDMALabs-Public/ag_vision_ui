import { NextRequest, NextResponse } from 'next/server';
import { getDatabricksConfig } from "../../upload/databricks/client";

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const targetPath = searchParams.get("path");

        if (!targetPath) {
            return NextResponse.json({ error: "No target path provided" }, { status: 400 });
        }

        const body = await request.json();
        const { type, features } = body;

        let config;
        try {
            config = await getDatabricksConfig();
        } catch (e) {
            return NextResponse.json({ error: (e as Error).message }, { status: 500 });
        }

        const geojsonData = JSON.stringify({
            type,
            features,
            metadata: {
                generated_at: new Date().toISOString(),
                source_path: targetPath,
            },
        }, null, 2);

        const response = await fetch(
            `${config.host}/api/2.0/fs/files${targetPath}`,
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    "Content-Type": "application/octet-stream",
                },
                body: geojsonData,
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Databricks error:", response.status, errorBody);
            return NextResponse.json({ error: errorBody }, { status: response.status });
        }

        return NextResponse.json({ message: "Boundary saved successfully", savedPath: targetPath });

    } catch (error: unknown) {
        console.error("Error in API Route:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}