import fs from "fs";
import path from "path";

export interface AppSettings {
    catalog: string;
    schema: string;
    volume: string;
}

const SETTINGS_PATH =
    process.env.SETTINGS_PATH ?? path.join(process.cwd(), "data", "settings.json");

export function loadSettings(): Partial<AppSettings> {
    try {
        if (!fs.existsSync(SETTINGS_PATH)) return {};
        const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
        return JSON.parse(raw) as Partial<AppSettings>;
    } catch {
        return {};
    }
}

export function saveSettings(settings: Partial<AppSettings>): void {
    const existing = loadSettings();
    const merged = { ...existing, ...settings };
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8");
}
