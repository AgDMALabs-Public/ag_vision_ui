import UploadForm from "../../components/UploadForm";
import {STUDY_BOUNDARY_TEMPLATE} from "@/app/lib/constants";


const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "missionName", label: "Mission Name", staticPathSegment: "drone"},
];


export default function DroneUpload() {
    return (
        <UploadForm
            title="Study Boundary Upload"
            upload_note=""
            volumeFields={VOLUME_FIELDS}
            pathTemplate={STUDY_BOUNDARY_TEMPLATE}
        />
    );
}