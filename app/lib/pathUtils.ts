export interface FieldDef {
    key: string;
    label: string;
    type?: string;
    min?: number;
    max?: number;
    step?: number;
    requiredWhen?: { key: string; value: string };
    options?: readonly string[];
    metadataSchema?: Record<string, any>;
    metadataFilePath?: string;
    staticPathSegment?: string;
    skipInPathUpTo?: boolean;
    recursiveSearch?: boolean;
    recursiveSearchDepth?: number;
}

export function buildPathUpTo(
    index: number,
    volumeFields: FieldDef[],
    metadata: Record<string, string>,
    volumeRoot: string
): string {
    // Get fields up to (not including) the current index
    const fieldsUpTo = volumeFields.slice(0, index);

    // Check if all required metadata is filled (excluding skipInPathUpTo fields)
    for (const field of fieldsUpTo) {
        if (!field.skipInPathUpTo && !metadata[field.key]) return "";
    }

    // Build path segments, accounting for static segments
    const segments = [volumeRoot];

    for (const field of fieldsUpTo) {
        // Skip fields marked with skipInPathUpTo
        if (field.skipInPathUpTo) continue;

        // Always add static segment if it exists
        if (field.staticPathSegment) {
            segments.push(field.staticPathSegment);
        }
        // Add the field's value
        segments.push(metadata[field.key]);
    }

    return segments.filter(Boolean).join("/");
}
