import NoteForm from "../components/noteForm";
import {SCOUTING_NOTES_TEMPLATE} from "@/app/lib/constants";

const VOLUME_FIELDS = [
    {key: "project", label: "Project"},
    {key: "site", label: "Site"},
    {key: "trial", label: "Trial"},
    {key: "season", label: "Season"},
    {key: "field", label: "Field"},
    {key: "location_name", label: "Location"},
    {key: "task", label: "Task"},
    {key: "protocol", label: "Protocol", staticPathSegment: "notes"},
    {key: "collectionDate", label: "Date of Collection", type: "date", skipInPathUpTo: true},
    {key: "plot_id", label: "Plot ID", recursiveSearch: true, recursiveSearchDepth: 1},
];



export default function AddNote() {
    return (
        <NoteForm
            title="Add Field Note"
            volumeFields={VOLUME_FIELDS}
            pathTemplate={SCOUTING_NOTES_TEMPLATE}
        />
    );
}