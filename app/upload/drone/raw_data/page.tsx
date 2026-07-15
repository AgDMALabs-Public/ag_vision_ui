import UploadForm from "../../components/UploadForm";
import { CAMERA_TYPES, STITCHING_SOFTWARE, CAMERA_MAKE } from "@/app/lib/constants";


const VOLUME_FIELDS = [
  { key: "project",        label: "Project" },
  { key: "site",           label: "Site" },
  { key: "season",           label: "Season (YYYY:Country:Crop:PlantingTime) Format" },
  { key: "trial",          label: "Trial" },
  { key: "field",          label: "Field" },
  { key: "location",       label: "Location" },
  { key: "task",           label: "Task" },
  { key: "protocol",       label: "Protocol" },
];

const EXTRA_FIELDS = [
  { key: "cameraType",          label: "Camera Type", options: CAMERA_TYPES },
  { key: "cameraMake",          label: "Camera Make", options: CAMERA_MAKE },
  { key: "cameraModel",         label: "Camera Model" },
  { key: "missionName",         label: "Mission Name" },
  { key: "flightHeight",        label: "Flight Height (m)",       type: "number", min: 0, step: 0.1 },
  { key: "flightDate",          label: "Flight Date",             type: "date" },
  { key: "verticalOverlap",     label: "Vertical Overlap (%)",    type: "number", min: 0, max: 100, step: 1 },
  { key: "horizontalOverlap",   label: "Horizontal Overlap (%)",  type: "number", min: 0, max: 100, step: 1 },
  { key: "reflectancePanels",   label: "Reflectance Panels Used", type: "boolean" },
  // Only shown & required when reflectancePanels === "yes"
  { key: "panelType",           label: "Panel Type",              requiredWhen: { key: "reflectancePanels", value: "yes" } },
];

const PATH_TEMPLATE =
    "/Volumes/{catalog}/{schema}/{volume}/{project}/{site}/{trial}/{season}/{field}/{location}/drone/{missionName}/{flightDate}/raw_data/{cameraType}/{fileName}";

export default function DroneUpload() {
  return (
    <UploadForm
      title="Raw Drone Data Upload"
      volumeFields={VOLUME_FIELDS}
      extraFields={EXTRA_FIELDS}
      pathTemplate={PATH_TEMPLATE}
    />
  );
}
