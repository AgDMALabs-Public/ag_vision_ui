"use client";

import {useEffect, useRef, useState} from "react";

interface WebcamVideoProps {
    onVideoCapture: (file: File) => void;
}

export default function WebcamVideo({onVideoCapture}: WebcamVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Timer for recording duration
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    // Attach stream to video element
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Clean up camera when component unmounts
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
                    facingMode: "user",
                    width: {ideal: 1920},
                    height: {ideal: 1080},
                    aspectRatio: {ideal: 1.7777777778}
                },
                audio: true, // Enable audio for video recording
            });

            setStream(mediaStream);
        } catch (err) {
            setErrorMessage("Unable to access camera/microphone. Please check permissions.");
            console.error("Camera error:", err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setRecordedVideo(null);
    };

    const startRecording = () => {
        if (!stream) return;

        chunksRef.current = [];
        setRecordingDuration(0);

        try {
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp9",
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {type: "video/webm"});
                const videoUrl = URL.createObjectURL(blob);
                setRecordedVideo(videoUrl);
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
        } catch (err) {
            setErrorMessage("Failed to start recording. Your browser may not support video recording.");
            console.error("Recording error:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const discardRecording = () => {
        if (recordedVideo) {
            URL.revokeObjectURL(recordedVideo);
        }
        setRecordedVideo(null);
        setRecordingDuration(0);
    };

    const submitVideo = async () => {
        if (!recordedVideo) return;

        const response = await fetch(recordedVideo);
        const blob = await response.blob();

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const uuid = crypto.randomUUID();
        const file = new File([blob], `${uuid}.webm`, {
            type: "video/webm",
        });

        onVideoCapture(file);
        discardRecording();
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
                    🎥 Start Camera
                </button>
            ) : (
                <>
                    <div className="image-box relative">
                        {recordedVideo ? (
                            <video
                                src={recordedVideo}
                                controls
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        )}
                        {isRecording && (
                            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center gap-2 font-medium">
                                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                                REC {formatDuration(recordingDuration)}
                            </div>
                        )}
                    </div>

                    {!recordedVideo ? (
                        <div className="flex gap-3">
                            {!isRecording ? (
                                <>
                                    <button
                                        onClick={startRecording}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-medium transition"
                                    >
                                        ⏺ Start Recording
                                    </button>
                                    <button
                                        onClick={stopCamera}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-4 py-2 font-medium transition"
                                    >
                                        Stop Camera
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={stopRecording}
                                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg px-4 py-2 font-medium transition"
                                >
                                    ⏹ Stop Recording
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="text-gray-300 text-sm">
                                📹 Video recorded ({formatDuration(recordingDuration)})
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={submitVideo}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-medium transition"
                                >
                                    ✓ Add to Upload
                                </button>
                                <button
                                    onClick={discardRecording}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-medium transition"
                                >
                                    🗑 Discard
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}