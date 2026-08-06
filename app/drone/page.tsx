import Link from "next/link";

export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">Drone Tools</h1>
            <div className="nav-button-container">
                <Link href="/drone/plot_alignment">
                    <button className="nav-button">
                        Plot Alignment
                    </button>
                </Link>
                <Link href="/drone/field_boundary">
                    <button className="nav-button">
                        Field Boundary
                    </button>
                </Link>
            </div>

        </main>
    );
}