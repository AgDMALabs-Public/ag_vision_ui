import UploadForm from "../components/UploadForm";

const VOLUME_FIELDS = [
  { key: "country",        label: "Country" },
  { key: "site",           label: "Site" },
  { key: "season",           label: "Season (YYYY:Country:Crop:PlantingTime) Format" },
  { key: "trial",          label: "Trial" },
  { key: "field",          label: "Field" },
  { key: "location",       label: "Location" },
  { key: "task",           label: "Task" },
  { key: "protocol",       label: "Protocol" },
  { key: "device",         label: "Device" },
  { key: "collectionDate", label: "Date of Collection", type: "date" },
];

const EXTRA_FIELDS = [
  { key: "cameraMake",        label: "Camera Make" },
  { key: "cameraModel",       label: "Camera Model" },
  { key: "cameraHeight",      label: "Camera Height (m)",      type: "number", min: 0, step: 0.01 },
  { key: "verticalOverlap",   label: "Vertical Overlap (%)",   type: "number", min: 0, max: 100, step: 1 },
  { key: "horizontalOverlap", label: "Horizontal Overlap (%)", type: "number", min: 0, max: 100, step: 1 },
];

const PATH_TEMPLATE =
  "/Volumes/{country}/{site}/{year}/{crop}/{trial}/{field}/{location}/{timeOfYear}/{task}/{protocol}/{device}/{collectionDate}/{fileName}";

export default function RoverUpload() {
  return (
    <UploadForm
      title="Rover Upload"
      volumeFields={VOLUME_FIELDS}
      extraFields={EXTRA_FIELDS}
      pathTemplate={PATH_TEMPLATE}
    />
  );
}
