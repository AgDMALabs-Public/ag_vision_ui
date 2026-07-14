import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      <h1 className="text-4xl font-bold text-white">AGV Upload</h1>

      <div className="nav-button-container">
        <Link href="/upload/mobile" className="nav-button">
          Mobile Upload
        </Link>
        <Link href="/upload/rover" className="nav-button">
          Rover Upload
        </Link>
        <Link href="/upload/drone" className="nav-button">
          Drone Upload
        </Link>
      </div>

    </main>
  );
}
