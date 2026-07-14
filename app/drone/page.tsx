import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-950 py-12 px-4">
            <h1 className="text-4xl font-bold text-white">AGV Upload</h1>

            <div className="nav-button-container">
                <Link href="/drone/plot_alignment" className="nav-button">
                    Plot Alignment
                </Link>
                <Link href="/drone/field_boundary" className="nav-button">
                    Field Boundary
                </Link>
            </div>

        </main>
    );
}