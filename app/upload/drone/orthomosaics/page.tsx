import UploadForm from "../../components/UploadForm";
import { CAMERA_TYPES, STITCHING_SOFTWARE, CAMERA_MAKE } from "@/app/lib/constants";


const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "trial", label: "Trial"},
    {key: "field", label: "Field"},
    {key: "location", label: "Location"},
    {key: "task", label: "Task"},
    {key: "protocol", label: "Protocol"},
];

const EXTRA_FIELDS = [
    {key: "cameraType", label: "Camera Type", options: CAMERA_TYPES},
    {key: "software", label: "stiching Software", options: STITCHING_SOFTWARE},
    {key: "cameraModel", label: "Camera Model", options: CAMERA_MAKE },
    {key: "missionName", label: "Mission Name"},
    {key: "flightDate", label: "flight Date", type: "date"},
    {key: "stichingDate", label: "Stiching Date", type: "date"},
];

const PATH_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/{flightDate}/orthomosaic/{software}_{stichingDate}/{cameraType}/{fileName}";

export default function DroneUpload() {
    return (
        <UploadForm
            title="Orthomosaic Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={PATH_TEMPLATE}
        />
    );
}