import Link from "next/link";
import '@agv_ui/styles';


export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">AG Vision UI</h1>
            <div className="nav-button-container">
                <Link href="/field_management/add_field">
                    <button className="nav-button">
                        Add Field
                    </button>
                </Link>
                <Link href="/field_management/add_note">
                    <button className="nav-button">
                        Add Note
                    </button>
                </Link>
            </div>
        </main>
    );
}
