import { NextRequest, NextResponse } from "next/server";
import { getDatabricksConfig } from "../client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") ?? "/Volumes";
    const filesOnly = searchParams.get("files") === "true";

    let config;
    try {
        config = getDatabricksConfig();
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    const response = await fetch(
        `${config.host}/api/2.0/fs/directories${path}`,
        {
            headers: {
                Authorization: `Bearer ${config.token}`,
            },
        }
    );

    if (!response.ok) {
        return NextResponse.json({ error: await response.text() }, { status: response.status });
    }

    const data = await response.json();

    const directories: string[] = (data.contents ?? [])
        .filter((item: { is_directory: boolean; name: string }) => {
            if (filesOnly) {
                return !item.is_directory && item.name.toLowerCase().endsWith(".png");
            }
            return item.is_directory;
        })
        .map((item: { path: string }) => {
            const clean = item.path.replace(/\/$/, "");
            return clean.split("/").pop() ?? "";
        })
        .filter((name: string) => name !== "");

    return NextResponse.json({ directories });
}