// Categorical dropdown options for form fields

export const CAMERA_TYPES = ["rgb", "ms"] as const;

export const STITCHING_SOFTWARE = [
    "Pix4D",
    "DroneDeploy",
    "Agisoft Metashape",
    "OpenDroneMap",
    "WebODM",
] as const;

export const PANEL_TYPES = [
    "MicaSense",
    "Sequoia",
    "Custom",
] as const;

export const CAMERA_MAKE = [
    "MicaSense",
    "DJI"
] as const;

export const PLOT_MAP_COLS = [
    "plot_id",
    "row",
    "column"
] as const;

// Add more categorical options as needed
// export const CAMERA_MAKES = ["DJI", "Parrot", "senseFly"] as const;