import PlotAlignmentSelector from "../components/PlotAlignmentSelector";

export default function PlotAlignmentPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-start gap-8 bg-gray-950 py-12 px-4">
            <h1 className="text-4xl font-bold text-white">Plot Alignment</h1>
            <PlotAlignmentSelector />
        </main>
    );
}
