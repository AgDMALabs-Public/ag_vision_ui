import Link from "next/link";

export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">AGV Upload</h1>
            <div className="nav-button-container">
                <Link href="/upload/image">
                    <button className="nav-button">
                        Image Upload
                    </button>
                </Link>
                <Link href="/upload/video">
                    <button className="nav-button">
                        Video Upload
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
