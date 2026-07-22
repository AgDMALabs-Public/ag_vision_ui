import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SETTINGS_PATH = process.env.SETTINGS_PATH ?? path.join(process.cwd(), "data", "settings.json");

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.catalog || !body.schema || !body.volume) {
            return NextResponse.json(
                { error: "Missing required fields: catalog, schema, volume" },
                { status: 400 }
            );
        }

        // Ensure directory exists
        const dir = path.dirname(SETTINGS_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write to settings.json
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(body, null, 2));

        return NextResponse.json({ success: true, message: "Settings saved" });
    } catch (error) {
        console.error("Error saving settings:", error);
        return NextResponse.json(
            { error: "Failed to save settings" },
            { status: 500 }
        );
    }
}