import Link from "next/link";

export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">AGV Upload</h1>
            <div className="nav-button-container">
                <Link href="/upload/drone/raw_data">
                    <button className="nav-button">
                        Raw Data
                    </button>
                </Link>
                <Link href="/upload/drone/orthomosaics">
                    <button className="nav-button">
                        Orthos
                    </button>
                </Link>
                <Link href="/upload/drone/plot_details" className="nav-button">
                    <button className="nav-button">
                        Plot Details
                    </button>
                </Link>
            </div>
        </main>
    );
}