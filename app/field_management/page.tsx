import Link from "next/link";
import '@agv_ui/styles';


export default function Home() {
    return (
        <main className="page-container">
            <h1 className="title">Field Management</h1>
            <div className="nav-button-container">
                <Link href="/field_management/add_field">
                    <button className="nav-button">
                        Add Field
                    </button>
                </Link>
            </div>
        </main>
    );
}
