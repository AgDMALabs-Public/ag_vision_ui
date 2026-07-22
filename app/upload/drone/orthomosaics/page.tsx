import UploadForm from "../../components/UploadForm";
import {CAMERA_TYPES, STITCHING_SOFTWARE, CAMERA_MAKE, ORTHOMOSAIC_TEMPLATE} from "@/app/lib/constants";


const VOLUME_FIELDS = [ // order matters for the path name and drop down search
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "missionName", label: "Mission Name", staticPathSegment: "drone"},
];

const EXTRA_FIELDS = [
    {key: "cameraType", label: "Camera Type", options: CAMERA_TYPES},
    {key: "software", label: "stiching Software", options: STITCHING_SOFTWARE},
    {key: "cameraModel", label: "Camera Model", options: CAMERA_MAKE},
    {key: "flightDate", label: "flight Date", type: "date"},
    {key: "stichingDate", label: "Stiching Date", type: "date"},
];


export default function DroneUpload() {
    return (
        <UploadForm
            title="Orthomosaic Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={ORTHOMOSAIC_TEMPLATE}
        />
    );
}