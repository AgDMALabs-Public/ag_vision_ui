"use client";

import {useState, useEffect} from "react";
import {useVolumeConfig} from "../context/VolumeConfigContext";

export default function SettingsPage() {
    const {config, setConfig} = useVolumeConfig();
    const [form, setForm] = useState(config);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setForm(config);
    }, [config]);

    const handleSave = async () => {
        setError(null);
        try {
            const res = await fetch("/api/config", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            setConfig(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <main className="page-container">
            <h1 className="title">Settings</h1>
            <section className="card">
                <h2 className="title-2">Volume Configuration</h2>
                <p className="title-3">
                    Set the Databricks Unity Catalog target for uploads. Settings are persisted on the server.
                </p>

                {(["catalog", "schema", "volume"] as const).map((field) => (
                    <div key={field} className="flex flex-col gap-1">
                        <label className="title-2">{field}</label>
                        <input
                            type="text"
                            value={form[field]}
                            onChange={(e) => setForm((prev) => ({...prev, [field]: e.target.value}))}
                            placeholder={`Enter ${field} name`}
                            className="loading-input"
                        />
                    </div>
                ))}

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                    onClick={handleSave}
                    disabled={!form.catalog || !form.schema || !form.volume}
                    className="nav-button"
                >
                    {saved ? "✓ Saved!" : "Save Settings"}
                </button>
            </section>
        </main>
    );
}