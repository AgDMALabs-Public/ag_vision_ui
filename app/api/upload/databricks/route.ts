import {NextRequest, NextResponse} from "next/server";
import {getDatabricksConfig} from "./client";

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const filePath = formData.get("filePath") as string;

    if (!file || !filePath) {
        return NextResponse.json({error: "Missing file or path"}, {status: 400});
    }

    let config;
    try {
        config = getDatabricksConfig();
    } catch (e) {
        return NextResponse.json({error: (e as Error).message}, {status: 500});
    }

    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(
        `${config.host}/api/2.0/fs/files${filePath}`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${config.token}`,
                "Content-Type": "application/octet-stream",
            },
            body: fileBuffer,
        }
    );

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Databricks error:", response.status, errorBody);
        return NextResponse.json({error: errorBody}, {status: response.status});
    }


    return NextResponse.json({success: true, path: filePath});
}