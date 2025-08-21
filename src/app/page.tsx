"use client";

import { useEffect, useRef, useState } from "react";
import { interpretImage, type AIInterpretation } from "../services/ai";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiInterpretation, setAiInterpretation] =
    useState<AIInterpretation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "environment", // Use back camera if available
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        setError(
          "Unable to access camera. Please ensure camera permissions are granted."
        );
        console.error("Error accessing camera:", err);
      }
    }

    setupCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  const captureFrame = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Analyze the captured frame with AI
        setIsAnalyzing(true);
        setAiInterpretation(null);

        try {
          const interpretation = await interpretImage(canvas);
          setAiInterpretation(interpretation);
        } catch (error) {
          console.error("Error analyzing image:", error);
          setAiInterpretation({
            success: false,
            text: "",
            error: "Failed to analyze image",
          });
        } finally {
          setIsAnalyzing(false);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Title */}
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
            🪄 PotionPlay
          </h1>
          <p className="text-xl text-purple-200">
            Magical webcam experience for your cauldron
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Webcam Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-center mb-4">
              Live Cauldron View
            </h2>
            <div className="relative">
              {error ? (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 text-center">
                  <p className="text-red-200">{error}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg border-4 border-yellow-400 shadow-2xl"
                  style={{ maxHeight: "400px", objectFit: "cover" }}
                />
              )}
              {isStreaming && (
                <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={captureFrame}
              disabled={!isStreaming || isAnalyzing}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              {isAnalyzing ? (
                <>
                  ✨ Analyzing with AI Magic...
                  <div className="inline-block ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                "📸 Capture & Analyze Frame"
              )}
            </button>
          </div>

          {/* Frame Display Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-center mb-4">
              Captured Frame
            </h2>
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border-4 border-green-400 shadow-2xl bg-gray-800"
              style={{ maxHeight: "400px", objectFit: "contain" }}
            />
            <div className="text-center text-gray-300">
              <p>Your magical moment will appear here</p>
            </div>
          </div>
        </div>

        {/* AI Interpretation Section */}
        {aiInterpretation && (
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-emerald-800/50 to-teal-800/50 backdrop-blur-sm rounded-xl p-6 border border-emerald-400/30">
              <h2 className="text-2xl font-bold text-center mb-4 text-emerald-400">
                🔮 AI Magical Analysis 🔮
              </h2>
              {aiInterpretation.success ? (
                <div className="text-lg text-emerald-100 leading-relaxed">
                  {aiInterpretation.text}
                </div>
              ) : (
                <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 text-center">
                  <p className="text-red-200">
                    {aiInterpretation.error ||
                      "Failed to analyze the magical contents"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-purple-800/50 to-blue-800/50 backdrop-blur-sm rounded-xl p-8 border border-purple-400/30">
            <h2 className="text-3xl font-bold text-center mb-6 text-yellow-400">
              ✨ How to Use PotionPlay ✨
            </h2>
            <ol className="space-y-4 text-lg">
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  1
                </span>
                <span>
                  Mount the device onto the cauldron, camera facing the pot
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  2
                </span>
                <span>Place your object or ingredient in the cauldron</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  3
                </span>
                <span>
                  Click{" "}
                  <strong className="text-yellow-400">
                    "Capture & Analyze Frame"
                  </strong>
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  4
                </span>
                <span>
                  Wait for the AI wizard to analyze your magical brewing!
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
