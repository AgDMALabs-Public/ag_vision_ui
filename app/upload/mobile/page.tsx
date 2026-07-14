import UploadForm from "../components/UploadForm";

// These fields map directly to consecutive volume path segments for directory browsing:
// /Volumes/{catalog}/{schema}/{volume}/{site}/{trial}/{season}/{field}/{location}/{task}
const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season"},
    {key: "field", label: "Field"},
    {key: "location", label: "Location"},
    {key: "task", label: "Task"},
];

// These fields come after the static "images" segment — entered manually
const EXTRA_FIELDS = [
    {key: "protocol", label: "Protocol"},
    {key: "collectionDate", label: "Date of Collection", type: "date"},
];

const PATH_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/{task}/images/{protocol}/{collectionDate}/{fileName}";

export default function MobileUpload() {
    return (
        <UploadForm
            title="Mobile Upload"
            volumeFields={VOLUME_FIELDS}
            extraFields={EXTRA_FIELDS}
            pathTemplate={PATH_TEMPLATE}
        />
    );
}

