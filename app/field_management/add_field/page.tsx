import DirectoryForm from "../components/DirectoryForm";
import {YEARS, COUNTRIES, CROPS, PLANTING_SEASON} from "@/app/lib/constants";

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "year", label: "Year", options: YEARS},
    {key: "country", label: "Country", options: COUNTRIES},
    {key: "crop", label: "Crop", options: CROPS},
    {key: "plantingSeason", label: "Planting Season", options: PLANTING_SEASON},
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