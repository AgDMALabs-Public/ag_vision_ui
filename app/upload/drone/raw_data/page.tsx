import UploadForm from "../../components/UploadForm";
import {
    CAMERA_TYPES,
    FLIGHT_DETAILS_TEMPLATE,
    CAMERA_MAKE,
    RAW_DRONE_TEMPLATE,
    DRONE_MAKE,
    DRONE_MODELS
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
    {key: "cameraModel", label: "Camera Model"},
    {key: "flightHeight", label: "Flight Height (m)", type: "number", min: 0, step: 0.1},
    {key: "verticalOverlap", label: "Vertical Overlap (%)", type: "number", min: 0, max: 100, step: 1},
    {key: "horizontalOverlap", label: "Horizontal Overlap (%)", type: "number", min: 0, max: 100, step: 1},
    {key: "reflectancePanels", label: "Reflectance Panels Used", type: "boolean"},
    // Only shown & required when reflectancePanels === "yes"
    {key: "panelType", label: "Panel Type", requiredWhen: {key: "reflectancePanels", value: "yes"}},
];


export default function DroneUpload() {
    const flightId = crypto.randomUUID();

    const metaMapping = {
        "missionName": "missionName",
        "task": "task",
        "site": "site",
        "field": "field",
        "location": "location_name",
        "trial": "trial",
        "droneMake": "droneMake",
        "droneModel": "droneModel",
        "cameraMake": "cameraMake",
        "cameraModel": "cameraModel",
        "reflectancePanels": "reflectancePanels",
        "panelType": "panelType",
        "flightHeight": "flightHeight",
        "horizontalOverlap": "horizontalOverlap",
        "verticalOverlap": "verticalOverlap"
    };

    const customMeta = {
        "id": flightId,
        "location": {
            "site": "site",
            "field": "field",
            "location": "loc"
        },
        "trialProperties": {
            "name": "trial"
        },
        "drone_acquisition_properties": {
            "droneMake": "Quantum-Systems",
            "droneModel": "Trinity F90+",
            "cameraMake": "cameraMake",
            "cameraModel": "cameraModel",
            "reflectancePanels": "reflectancePanels",
            "reflectancePanelType": "panelType",
            "flightHeight": "flightHeight",
            "horizontalOverlapPercentage": "horizontalOverlap",
            "verticalOverlapPercentage": "verticalOverlap"
        }
    };


    return (
        <UploadForm
            title="Raw Drone Data Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={RAW_DRONE_TEMPLATE}
            metadataTemplate={FLIGHT_DETAILS_TEMPLATE}
            metadataSchema={metaMapping}
            customMetadata={customMeta}
        />
    );
}
