import UploadForm from "../components/UploadForm";
import {MOBILE_SCOUTING_TEMPLATE} from "../../lib/constants"

// These fields map directly to consecutive volume path segments for directory browsing:
// /Volumes/{catalog}/{schema}/{volume}/{site}/{trial}/{season}/{field}/{location}/{task}
const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season (YYYY:Country:Crop:PlantingTime) Format"},
    {key: "field", label: "Field"},
    {key: "location", label: "Location"},
    {key: "task", label: "Task"},
    {key: "protocol", label: "Protocol"},
];

// These fields come after the static "images" segment — entered manually
const EXTRA_FIELDS = [
    {key: "collectionDate", label: "Date of Collection", type: "date"},
];



export default function MobileUpload() {
    return (
        <UploadForm
            title="Mobile Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={MOBILE_SCOUTING_TEMPLATE}
        />
    );
}

