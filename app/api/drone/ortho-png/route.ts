import { NextRequest, NextResponse } from "next/server";
import { getDatabricksConfig } from "../../upload/databricks/client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
        return new NextResponse("Missing path", { status: 400 });
    }

    let config;
    try {
        config = getDatabricksConfig();
    } catch (e) {
        return new NextResponse((e as Error).message, { status: 500 });
    }

    const fileRes = await fetch(`${config.host}/api/2.0/fs/files${path}`, {
        headers: {
            Authorization: `Bearer ${config.token}`,
        },
    });

    if (!fileRes.ok) {
        return new NextResponse(await fileRes.text(), { status: fileRes.status });
    }

    return new NextResponse(fileRes.body, {
        status: 200,
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
