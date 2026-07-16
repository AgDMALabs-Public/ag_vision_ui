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

export const DRONE_MAKE = [
    "DJI"
] as const;

export const DRONE_MODELS = [
    "DJI Mavic 4 Pro",
    "DJI Mavic 3 Enterprise"
] as const;

export const PLOT_MAP_COLS = [
    "plot_id",
    "row",
    "column"
] as const;


// Paths to save the data
export const RAW_DRONE_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/{flightDate}/raw_data/{cameraType}/{fileName}";

export const FLIGHT_DETAILS_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/{flightDate}/flight_details.json";

export const PLOT_BOOK_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/field_data/plot_book.csv";

export const ORTHOMOSAIC_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/{flightDate}/orthomosaic/{software}_{stichingDate}/{cameraType}/{fileName}";

export const MOBILE_SCOUTING_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/{task}/images/{protocol}/{collectionDate}/{fileName}";

export const RAW_ROVER_TEMPLATE = "/Volumes/{country}/{site}/{year}/{crop}/{trial}/{field}/{location}/{timeOfYear}/{task}/{protocol}/{device}/{collectionDate}/{fileName}";