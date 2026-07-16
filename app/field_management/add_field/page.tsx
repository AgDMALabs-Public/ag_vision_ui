import DirectoryForm from "../components/DirectoryForm";

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "year", label: "Year"},
    {key: "country", label: "Country"},
    {key: "crop", label: "Crop"},
    {key: "plantingSeason", label: "Planting Season"},
    {key: "field", label: "Field"},
    {key: "location", label: "Location"},
];

const PATH_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{year}:{country}:{crop}:{plantingSeason}/{field}/{location}";

export default function AddField() {
    return (
        <DirectoryForm
            title="Field Registration"
            volumeFields={VOLUME_FIELDS}
            pathTemplate={PATH_TEMPLATE}
        />
    );
}