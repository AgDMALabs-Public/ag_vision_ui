"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface VolumeConfig {
    catalog: string;
    schema: string;
    volume: string;
}

interface VolumeConfigContextType {
    config: VolumeConfig;
    setConfig: (config: VolumeConfig) => void;
    isConfigured: boolean;
}

const DEFAULT_CONFIG: VolumeConfig = { catalog: "", schema: "", volume: "" };

const VolumeConfigContext = createContext<VolumeConfigContextType>({
    config: DEFAULT_CONFIG,
    setConfig: () => {},
    isConfigured: false,
});

export function VolumeConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfigState] = useState<VolumeConfig>(DEFAULT_CONFIG);

    useEffect(() => {
        // First, try to load from the server (env vars)
        fetch("/api/config")
            .then((res) => res.json())
            .then((serverConfig: VolumeConfig) => {
                if (serverConfig.catalog && serverConfig.schema && serverConfig.volume) {
                    setConfigState(serverConfig);
                } else {
                    // Fall back to localStorage if env vars aren't set
                    const stored = localStorage.getItem("volumeConfig");
                    if (stored) setConfigState(JSON.parse(stored));
                }
            })
            .catch(() => {
                const stored = localStorage.getItem("volumeConfig");
                if (stored) setConfigState(JSON.parse(stored));
            });
    }, []);

    const setConfig = (newConfig: VolumeConfig) => {
        setConfigState(newConfig);
        localStorage.setItem("volumeConfig", JSON.stringify(newConfig));
    };

    const isConfigured = !!(config.catalog && config.schema && config.volume);

    return (
        <VolumeConfigContext.Provider value={{ config, setConfig, isConfigured }}>
            {children}
        </VolumeConfigContext.Provider>
    );
}

export function useVolumeConfig() {
    return useContext(VolumeConfigContext);
}
