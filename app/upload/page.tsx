import Link from "next/link";

export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">AGV Upload</h1>
            <div className="nav-button-container">
                <Link href="/upload/mobile">
                    <button className="nav-button">
                        Mobile Upload
                    </button>
                </Link>
                <Link href="/upload/rover">
                    <button className="nav-button">
                        Rover Upload
                    </button>
                </Link>
                <Link href="/upload/drone" className="nav-button">
                    <button className="nav-button">
                        Drone Upload
                    </button>
                </Link>
            </div>
        </main>
    );
}
