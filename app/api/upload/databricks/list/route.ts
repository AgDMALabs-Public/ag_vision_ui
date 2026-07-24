import { NextRequest, NextResponse } from "next/server";
import { getDatabricksConfig } from "../client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") ?? "/Volumes";
    const filesOnly = searchParams.get("files") === "true";
    const recursive = searchParams.get("recursive") === "true";
    const depth = searchParams.get("depth") ? parseInt(searchParams.get("depth")!) : undefined;

    let config;
    try {
        config = await getDatabricksConfig();
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }

    try {
        if (recursive) {
            // For recursive search at a specific depth, skip intermediate directories
            const directories = await collectDirectoriesAtDepth(
                path,
                config,
                new Set(),
                depth ?? 2 // Default to depth 2 (skip 1 level)
            );
            return NextResponse.json({ directories: Array.from(directories).sort() });
        } else {
            // Original behavior: list immediate children only
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
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

async function collectDirectoriesAtDepth(
    path: string,
    config: { host: string; token: string },
    collected: Set<string>,
    targetDepth: number,
    currentDepth: number = 0
): Promise<Set<string>> {
    try {
        const response = await fetch(`${config.host}/api/2.0/fs/directories${path}`, {
            headers: {
                Authorization: `Bearer ${config.token}`,
            },
        });

        if (!response.ok) return collected;

        const data = await response.json();
        const items = data.contents ?? [];

        for (const item of items) {
            if (item.is_directory) {
                // If we're at target depth, collect this directory name
                if (currentDepth === targetDepth) {
                    const dirName = item.path.replace(/\/$/, "").split("/").pop();
                    if (dirName) collected.add(dirName);
                }
                // If we haven't reached target depth yet, recurse deeper
                else if (currentDepth < targetDepth) {
                    await collectDirectoriesAtDepth(
                        item.path,
                        config,
                        collected,
                        targetDepth,
                        currentDepth + 1
                    );
                }
            }
        }
    } catch (error) {
        console.error(`Error collecting directories at ${path}:`, error);
    }

    return collected;
}