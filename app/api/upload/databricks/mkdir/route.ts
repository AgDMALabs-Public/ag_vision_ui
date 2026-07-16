import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { path } = await req.json();

        if (!path) {
            return NextResponse.json({ error: "Path is required" }, { status: 400 });
        }

        const token = process.env.DATABRICKS_TOKEN;
        const host = process.env.DATABRICKS_HOST;

        const res = await fetch(`${host}/api/2.0/fs/directories${path}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (res.ok || res.status === 409) { // 409 means already exists
            return NextResponse.json({ success: true });
        }

        const error = await res.text();
        return NextResponse.json({ error }, { status: res.status });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create directory" }, { status: 500 });
    }
}