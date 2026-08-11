import UploadForm from "../../components/UploadForm";
import {
    CAMERA_TYPES,
    FLIGHT_DETAILS_TEMPLATE,
    CAMERA_MAKE,
    RAW_DRONE_TEMPLATE,
    DRONE_MAKE,
    DRONE_MODELS, CAMERA_MODEL
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
    {key: "panelType", label: "Panel Type", requiredWhen: {key: "reflectancePanels", value: "yes"}},
];


export default function DroneUpload() {
    const flightId = crypto.randomUUID();

    const metaMapping = {
        "missionName": "missionName",
        "task": "task",
        "site": "site",
        "field": "field",
        "loc": "location_name",
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
            "site": null,
            "field": null,
            "location": null
        },
        "trialProperties": {
            "name": null
        },
        "drone_acquisition_properties": {
            "droneMake": null,
            "droneModel": null,
            "cameraMake": null,
            "cameraModel": null,
            "reflectancePanels": null,
            "reflectancePanelType": null,
            "flightHeight": null,
            "horizontalOverlapPercentage": null,
            "verticalOverlapPercentage": null
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
