import FieldBoundaryGenerator from "../components/FieldBoundaryGenerator";

export default function FieldBoundaryPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-start gap-8 bg-gray-950 py-12 px-4">
            <h1 className="text-4xl font-bold text-white">Field Boundary Generator</h1>
            <FieldBoundaryGenerator />
        </main>
    );
}