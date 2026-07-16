import NoteForm from "../components/noteForm";

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season"},
    {key: "country", label: "Country"},
    {key: "crop", label: "Crop"},
    {key: "plantingSeason", label: "Planting Season"},
    {key: "field", label: "Field"},
    {key: "location", label: "Location"},
];

const PATH_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/notes/{noteFileName}";

export default function AddNote() {
    return (
        <NoteForm
            title="Add Field Note"
            volumeFields={VOLUME_FIELDS}
            pathTemplate={PATH_TEMPLATE}
        />
    );
}