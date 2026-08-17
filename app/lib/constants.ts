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
    "MicaSense"
] as const;

export const ROVER_MAKE = [
    'newco',
    'artemis'
]

export const ROVER_MODEL = [
    'jetson',
    'bruno'
]

export const ROVER_CAMERA_MAKE = [
    'luxonis'
]

export const ROVER_CAMERA_MODEL = [
    'Oak-1'
]

export const CAMERA_MAKE = [
    "MicaSense",
    "DJI",
    "Unknown"
] as const;

export const CAMERA_MODEL = [
    "Olympus Zuiko",
    "Zenmuse X5s (Optics 15mm), CMOS, 4/3”",
    "AIRPHEN (8 mm) - MS",
    "Micasense Rededge IR-400-1100",
    "PIKA L (2.1 mm)",
    "Unknown"

] as const;

export const DRONE_MAKE = [
    "DJI",
    "Unknown"
] as const;

export const DRONE_MODELS = [
    "DJI Mavic 4 Pro",
    "DJI Mavic 3 Enterprise",
    "DJI Matrice 210",
    "DJI Matrics 600",
    "Unknown"
] as const;

export const YEARS = [
    "2020",
    "2021",
    "2022",
    "2023",
    "2024",
    "2025",
    "2026",
    "2027",
    "2028",
    "2029",
    "2030"
] as const;

export const COUNTRIES = [
    "USA",
    "IND",
    "TZA",
    "COL",
    "KEN",
    "NGA",
] as const;


export const CROPS = ["barley", "maize", "pearl_millet", "finger_millet", "rice", "sorghum", "wheat", "bush_bean",
    "climbing_bean", "common_bean", "chickpea", 'cowpea', "faba_bean", "grass_pea",
    "groundnut", "lentil", "pigeonpea", "soybean", "banana", "cassava", "potato",
    "sweet_potato", "yam", "taro", "sugarcane", 'legumes', 'tomato', 'turmeric', 'sesame',
    'onion']

export const PLANTING_SEASON = ['summer', 'fall', 'winter', 'spring', 'short_rain', 'long_rain']

export const PLOT_MAP_COLS = [
    "plot_id",
    "x",
    "y",
    "field_x",
    "field_y",
    "ebs_plot_id",
    "site",
    'field'
] as const;


// Paths to save the data
export const RAW_DRONE_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/drone/{missionName}/{flightDate}/raw_data/{cameraType}/{fileName}";

export const FLIGHT_DETAILS_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/drone/{missionName}/{flightDate}/flight_details.json";

export const PLOT_BOOK_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/drone/{missionName}/field_data/plot_book.csv";

export const ORTHOMOSAIC_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/drone/{missionName}/{flightDate}/orthomosaic/{software}_{stichingDate}/{cameraType}/{fileName}";

export const MOBILE_SCOUTING_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/{task}/images/{protocol}/{collectionDate}/{plot_id}/{fileName}";

export const VIDEO_SCOUTING_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/{task}/videos/{protocol}/{collectionDate}/{plot_id}/{fileName}";

export const RAW_ROVER_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/rover/{missionName}/{scanDate}/raw_data/{cameraType}/{fileName}";

export const ROVER_DETAILS_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/rover/{missionName}/{scanDate}/raw_data/{cameraType}/scan_details.json";

export const SCOUTING_NOTES_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/{task}/notes/{protocol}/{collectionDate}/{plot_id}/{noteFileName}";

export const WEBCAM_IMAGE_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/{task}/images/{protocol}/{collectionDate}/{plot_id}/{noteFileName}";

export const WEBCAM_VIDEO_TEMPLATE = "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location_name}/{task}/videos/{protocol}/{collectionDate}/{plot_id}/{noteFileName}";

