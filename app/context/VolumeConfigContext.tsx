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
        fetch("/api/config")
            .then((res) => res.json())
            .then((serverConfig: Partial<VolumeConfig>) => {
                if (serverConfig.catalog && serverConfig.schema && serverConfig.volume) {
                    setConfigState(serverConfig as VolumeConfig);
                }
            })
            .catch(() => {});
    }, []);

    const setConfig = (newConfig: VolumeConfig) => {
        setConfigState(newConfig);
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
