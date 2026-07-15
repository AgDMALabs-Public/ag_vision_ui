import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "../../lib/settings";

// GET /api/config — returns current settings
export async function GET() {
    const settings = loadSettings();
    return NextResponse.json(settings);
}

// POST /api/config — saves settings to persistent JSON file
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        saveSettings(body);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return NextResponse.json(
            { error: (e as Error).message },
            { status: 500 }
        );
    }
}