import UploadForm from "../../components/UploadForm";
import {PLOT_MAP_COLS, PLOT_BOOK_TEMPLATE} from "@/app/lib/constants";


const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "trial", label: "Trial"},
    {key: "field", label: "Field"},
    {key: "location", label: "Location"},
];

const EXTRA_FIELDS = [
    {key: "missionName", label: "Mission Name"},
];


const CSV_VALIDATION = {
    type: "csv" as const,
    requiredColumns: PLOT_MAP_COLS,
};

export default function DroneUpload() {
    return (
        <UploadForm
            title="Plot Details Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={PLOT_BOOK_TEMPLATE}
            fileValidation={CSV_VALIDATION}
        />
    );
}