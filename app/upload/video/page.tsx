import UploadForm from "../components/UploadForm";
import {VIDEO_SCOUTING_TEMPLATE} from "../../lib/constants"

// These fields map directly to consecutive volume path segments for directory browsing:
// /Volumes/{catalog}/{schema}/{volume}/{site}/{trial}/{season}/{field}/{location}/{task}
const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "task", label: "Task"},
    {key: "protocol", label: "Protocol", staticPathSegment: "images"},
    {key: "collectionDate", label: "Date of Collection", type: "date", skipInPathUpTo: true},
    {key: "plot_id", label: "Plot ID", recursiveSearch: true, recursiveSearchDepth: 1},
];


export default function MobileUpload() {
    return (
        <UploadForm
            title="Mobile Upload"
            volumeFields={VOLUME_FIELDS}
            pathTemplate={VIDEO_SCOUTING_TEMPLATE}
        />
    );
}

