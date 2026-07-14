// app/api/config/route.ts
import { NextResponse } from "next/server";

export async function GET() {
    const catalog = process.env.VOLUME_CATALOG ?? "";
    const schema  = process.env.VOLUME_SCHEMA  ?? "";
    const volume  = process.env.VOLUME_VOLUME  ?? "";

    return NextResponse.json({ catalog, schema, volume });
}