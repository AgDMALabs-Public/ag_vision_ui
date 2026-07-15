// app/lib/basePath.ts
export function getBasePath(): string {
    if (typeof document === "undefined") return "";
    return document
        .querySelector<HTMLMetaElement>('meta[name="app-base-path"]')
        ?.content ?? "";
}