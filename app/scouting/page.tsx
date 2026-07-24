import Link from "next/link";
import '@agv_ui/styles';


export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">Scounting</h1>
            <div className="nav-button-container">
                <Link href="/scouting/add_note">
                    <button className="nav-button">
                        Scouting Notes
                    </button>
                </Link>
                <Link href="/scouting/image_capture">
                    <button className="nav-button">
                        Image Capture
                    </button>
                </Link>
            </div>
        </main>
    );
}
