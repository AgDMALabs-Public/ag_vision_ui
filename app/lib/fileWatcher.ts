import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";

let settingsCache: any = null;
let watchers: FSWatcher[] = [];

const SETTINGS_PATH =
    process.env.SETTINGS_PATH ?? path.join(process.cwd(), "data", "settings.json");

export function initFileWatcher() {
    if (watchers.length > 0) return; // Already watching

    const watcher = chokidar.watch(SETTINGS_PATH, {
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 100,
        },
    });

    watcher.on("change", () => {
        console.log("Settings file changed, clearing cache");
        settingsCache = null;
    });

    watchers.push(watcher);
    console.log(`File watcher started for ${SETTINGS_PATH}`);
}

export function loadSettingsWithCache(): Partial<any> {
    if (settingsCache !== null) {
        return settingsCache;
    }

    try {
        if (!fs.existsSync(SETTINGS_PATH)) {
            settingsCache = {};
            return {};
        }
        const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
        settingsCache = JSON.parse(raw);
        return settingsCache;
    } catch {
        settingsCache = {};
        return {};
    }
}

export function stopFileWatchers() {
    watchers.forEach((w) => w.close());
    watchers = [];
}