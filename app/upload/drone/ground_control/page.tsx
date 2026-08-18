import UploadForm from "../../components/UploadForm";
import {GROUND_CONTROL_POINTS_COLS, GCP_TEMPLATE} from "@/app/lib/constants";


const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "missionName", label: "Mission Name", staticPathSegment: "drone"},
];


const CSV_VALIDATION = {
    type: "csv" as const,
    requiredColumns: GROUND_CONTROL_POINTS_COLS,
};

export default function DroneUpload() {
    return (
        <UploadForm
            title="Ground Control Point Upload"
            upload_note="Required Columns: "
            volumeFields={VOLUME_FIELDS}
            pathTemplate={GCP_TEMPLATE}
            fileValidation={CSV_VALIDATION}
        />
    );
}