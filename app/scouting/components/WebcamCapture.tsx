"use client";

import {useEffect, useRef, useState} from "react";

interface WebcamCaptureProps {
    onPhotosCapture: (files: File[]) => void;
}

export default function WebcamCapture({onPhotosCapture}: WebcamCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Whenever the stream changes, attach it to the video element safely
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Clean up the camera when the component unmounts
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [stream]);

    const startCamera = async () => {
        try {
            setErrorMessage(null);

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user", // Switched to front-facing webcam
                    width: {ideal: 1920},
                    height: {ideal: 1080},
                    aspectRatio: {ideal: 1.7777777778} // Forces 16:9 widescreen orientation
                },
                audio: false,
            });

            // Setting the stream will trigger the component to re-render,
            // show the <video> element, and then trigger the useEffect above.
            setStream(mediaStream);
        } catch (err) {
            setErrorMessage("Unable to access camera. Please check permissions.");
            console.error("Camera error:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Prevent capturing if video hasn't loaded dimensions yet
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        // Set canvas to the actual native video resolution
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");
        if (context) {
            context.drawImage(video, 0, 0);
            // Capture at 100% maximum JPEG quality
            const photoDataUrl = canvas.toDataURL("image/jpeg", 1.0);
            setCapturedPhotos((prev) => [...prev, photoDataUrl]);
        }
    };

    const removePhoto = (index: number) => {
        setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const submitPhotos = async () => {
        const files: File[] = [];
        for (let i = 0; i < capturedPhotos.length; i++) {
            const dataUrl = capturedPhotos[i];
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const uuid = crypto.randomUUID();
            const file = new File([blob], `${uuid}.jpg`, {
                type: "image/jpeg",
            });
            files.push(file);

        }
        onPhotosCapture(files);
        setCapturedPhotos([]);
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            {errorMessage && (
                <div className="p-3 bg-red-900 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {errorMessage}
                </div>
            )}

            {!stream ? (
                <button
                    onClick={startCamera}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-3 font-medium transition"
                >
                    📷 Start Camera
                </button>
            ) : (
                <>
                    <div className="image-box">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={capturePhoto}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-medium transition"
                        >
                            📸 Capture Photo
                        </button>
                        <button
                            onClick={stopCamera}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-medium transition"
                        >
                            Stop Camera
                        </button>
                    </div>
                </>
            )}

            {capturedPhotos.length > 0 && (
                <div className="flex flex-col gap-3 mt-4">
                    <h3 className="title-3">Captured Photos ({capturedPhotos.length})</h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {capturedPhotos.map((photo, index) => (
                            <div key={index} className="relative bg-gray-800 rounded-lg overflow-hidden">
                                <img
                                    src={photo}
                                    alt={`Captured ${index + 1}`}
                                    className="w-full h-24 object-cover"
                                />
                                <button
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1 text-xs font-medium"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={submitPhotos}
                            className="nav-button"
                        >
                            ✓ Add Photos to Upload
                        </button>
                        <button
                            onClick={() => setCapturedPhotos([])}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-4 py-2 font-medium transition"
                        >
                            Clear Photos
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden canvas for taking the actual photo snapshots */}
            <canvas ref={canvasRef} className="hidden"/>
        </div>
    );
}