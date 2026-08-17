import UploadForm from "../../components/UploadForm";
import {
    CAMERA_TYPES,
    FLIGHT_DETAILS_TEMPLATE,
    CAMERA_MAKE,
    RAW_DRONE_TEMPLATE,
    DRONE_MAKE,
    DRONE_MODELS,
    CAMERA_MODEL,
    PANEL_TYPES
} from "@/app/lib/constants";


const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "missionName", label: "Mission Name", staticPathSegment: "drone"},
    {key: "flightDate", label: "Flight Date", type: "date"},
];

const EXTRA_FIELDS = [
    {key: "droneMake", label: "Drone Make", options: DRONE_MAKE},
    {key: "droneModel", label: "Drone Model", options: DRONE_MODELS},
    {key: "cameraType", label: "Camera Type", options: CAMERA_TYPES},
    {key: "cameraMake", label: "Camera Make", options: CAMERA_MAKE},
    {key: "cameraModel", label: "Camera Model", options: CAMERA_MODEL},
    {key: "flightHeight", label: "Flight Height (m)", type: "number", min: 0, step: 0.1},
    {key: "verticalOverlap", label: "Vertical Overlap (%)", type: "number", min: 0, max: 100, step: 1},
    {key: "horizontalOverlap", label: "Horizontal Overlap (%)", type: "number", min: 0, max: 100, step: 1},
    {key: "reflectancePanels", label: "Reflectance Panels Used", type: "boolean"},
    // Only shown & required when reflectancePanels === "yes"
    {key: "panelType", label: "Panel Type", requiredWhen: {key: "reflectancePanels", value: "yes"}, options: PANEL_TYPES},
];


export default function DroneUpload() {
    const flightId = crypto.randomUUID();

    const metaMapping = {
        "location.site": "site",
        "location.field": "field",
        "location.location": "location_name",
        "trial_properties.name": "trial",
        "drone_acquisition_properties.date": "flightDate",
        "drone_acquisition_properties.drone_make": "droneMake",
        "drone_acquisition_properties.drone_model": "droneModel",
        "drone_acquisition_properties.camera_make": "cameraMake",
        "drone_acquisition_properties.camera_model": "cameraModel",
        "drone_acquisition_properties.reflectance_panels": "reflectancePanels",
        "drone_acquisition_properties.reflectance_panel_type": "panelType",
        "drone_acquisition_properties.flight_height_m": "flightHeight",
        "drone_acquisition_properties.horizontal_overlap_percentage": "horizontalOverlap",
        "drone_acquisition_properties.vertical_overlap_percentage": "verticalOverlap"
    };

    // please follow schema laid out here: https://github.com/AgDMALabs-Public/AgDMALabs-open/blob/main/open_aglabs/drone/model.py
    const customMeta = {
        "id": flightId,
        "location": {
            "site": null,
            "field": null,
            "location": null
        },
        "trial_properties": {
            "name": null
        },
        "drone_acquisition_properties": {
            "date": null,
            "drone_make": null,
            "drone_model": null,
            "camera_make": null,
            "camera_model": null,
            "reflectance_panels": null,
            "reflectance_panel_type": null,
            "flight_height_m": null,
            "horizontal_overlap_percentage": null,
            "vertical_overlap_percentage": null
        }
    };


    return (
        <UploadForm
            title="Raw Drone Data Upload"
            upload_note=""
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={RAW_DRONE_TEMPLATE}
            metadataTemplate={FLIGHT_DETAILS_TEMPLATE}
            metadataSchema={metaMapping}
            customMetadata={customMeta}
        />
    );
}
