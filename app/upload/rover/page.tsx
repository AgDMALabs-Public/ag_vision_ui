import UploadForm from "../components/UploadForm";
import {
    ROVER_DETAILS_TEMPLATE, RAW_ROVER_TEMPLATE, ROVER_CAMERA_MAKE, ROVER_CAMERA_MODEL, ROVER_MAKE, ROVER_MODEL,
    CAMERA_TYPES
} from "../../lib/constants"

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "missionName", label: "Mission Name", staticPathSegment: "rover"},
    {key: "scanDate", label: "Scan Date", type: "date"},
];

const EXTRA_FIELDS = [
    {key: "roverMake", label: "Rover Make", options: ROVER_MAKE},
    {key: "roverModel", label: "Rover Model", options: ROVER_MODEL},
    {key: "cameraType", label: "Camera Type", options: CAMERA_TYPES},
    {key: "cameraMake", label: "Camera Make", options: ROVER_CAMERA_MAKE},
    {key: "cameraModel", label: "Camera Model", options: ROVER_CAMERA_MODEL},
    {key: "cameraHeight", label: "Camera Height (m)", type: "number", min: 0, step: 0.01},
    {key: "verticalOverlap", label: "Vertical Overlap (%)", type: "number", min: 0, max: 100, step: 1},
    {key: "horizontalOverlap", label: "Horizontal Overlap (%)", type: "number", min: 0, max: 100, step: 1},
];


export default function RoverUpload() {
    const scanId = crypto.randomUUID();

    const metaMapping = {
        "location.site": "site",
        "location.field": "field",
        "location.location": "location_name",
        "trial_properties.name": "trial",
        "rover_acquisition_properties.date": "scanDate",
        "rover_acquisition_properties.rover_make": "rover_make",
        "rover_acquisition_properties.rover_model": "roverModel",
        "rover_acquisition_properties.camera_make": "cameraMake",
        "rover_acquisition_properties.camera_model": "cameraModel",
        "rover_acquisition_properties.camera_height_m": "cameraHeight",
        "rover_acquisition_properties.horizontal_overlap_percentage": "horizontalOverlap",
        "rover_acquisition_properties.vertical_overlap_percentage": "verticalOverlap"
    };

    // Please follow schema laid out here: https://github.com/AgDMALabs-Public/AgDMALabs-open/blob/main/open_aglabs/rover/models.py
    const customMeta = {
        "id": scanId,
        "location": {
            "site": null,
            "field": null,
            "location": null
        },
        "trial_properties": {
            "name": null,
        },
        "rover_acquisition_properties": {
            "date": null,
            "rover_make": null,
            "rover_model": null,
            "camera_make": null,
            "camera_model": null,
            "camera_height_m": null,
            "horizontal_overlap_percentage": null,
            "vertical_overlap_percentage": null
        }
    };

    return (
        <UploadForm
            title="Rover Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={RAW_ROVER_TEMPLATE}
            metadataTemplate={ROVER_DETAILS_TEMPLATE}
            metadataSchema={metaMapping}
            customMetadata={customMeta}
        />
    );
}
