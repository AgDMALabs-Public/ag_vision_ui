import Link from "next/link";
import '@agv_ui/styles';


export default function Home() {
    return (
        <main className="page-container">
            <h1 className="text-4xl font-bold text-white">AG Vision UI</h1>
            <div className="nav-button-container">
                <Link href="/drone">
                    <button className="nav-button">
                        Drone
                    </button>
                </Link>
                <Link href="/upload">
                    <button className="nav-button">
                        Data Upload
                    </button>
                </Link>
                <Link href="/settings">
                    <button className="nav-button">
                        Settings
                    </button>
                </Link>
            </div>
        </main>
    );
}
