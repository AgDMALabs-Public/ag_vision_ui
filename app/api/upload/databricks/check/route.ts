import { NextRequest, NextResponse } from "next/server";
import { getDatabricksConfig } from "../client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "No path provided" }, { status: 400 });
  }

  let config;
  try {
    config = getDatabricksConfig();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const response = await fetch(
    `${config.host}/api/2.0/fs/files${path}`,
    {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    }
  );

  return NextResponse.json({ exists: response.ok });
}