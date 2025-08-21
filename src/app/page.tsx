"use client";

import { useEffect, useRef, useState } from "react";
import {
  interpretImage,
  type AIInterpretation,
  generateSpeech,
} from "../services/ai";

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiInterpretation, setAiInterpretation] =
    useState<AIInterpretation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Conversation state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  // Speech recognition ref
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Control recognition restarts and trigger gating
  const autoRestartRef = useRef(true);
  const inProgressRef = useRef(false);
  const lastTriggerTsRef = useRef<number>(0);
  const COOLDOWN_MS = 12000; // prevent rapid re-triggers after a run
  const DEBOUNCE_MS = 2000; // avoid duplicate triggers from interim results
  // Using server-side TTS (no browser voice selection needed)

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
        if (inProgressRef.current) return;
        inProgressRef.current = true;
        setIsAnalyzing(true);
        setAiInterpretation(null);

        try {
          const interpretation = await interpretImage(canvas);
          setAiInterpretation(interpretation);
          if (interpretation.success && interpretation.text) {
            // Speak immediately after analysis completes
            await speakText(interpretation.text);
          }
        } catch (error) {
          console.error("Error analyzing image:", error);
          setAiInterpretation({
            success: false,
            text: "",
            error: "Failed to analyze image",
          });
        } finally {
          setIsAnalyzing(false);
          lastTriggerTsRef.current = Date.now();
          inProgressRef.current = false;
        }
      }
    }
  };

  // Speak using server-generated audio (OpenAI TTS via Netlify function)
  const speakText = async (text: string) => {
    autoRestartRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {}

    const tts = await generateSpeech(text);
    if (!tts.success || !tts.audioData) {
      autoRestartRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch {}
      return;
    }

    const mime = tts.mimeType || "audio/mpeg";
    const audio = new Audio(`data:${mime};base64,${tts.audioData}`);

    await new Promise<void>((resolve) => {
      audio.addEventListener("play", () => setIsSpeaking(true));
      const finalize = () => {
        setIsSpeaking(false);
        autoRestartRef.current = true;
        setTranscriptText("");
        try {
          recognitionRef.current?.start();
        } catch {}
        resolve();
      };
      audio.addEventListener("ended", finalize);
      audio.addEventListener("error", finalize);
      audio.play().catch(finalize);
    });
  };

  // Speech recognition setup
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setTranscriptText("");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setTranscriptText(transcript);

        // Trigger magic word: "abra cadabra"
        const now = Date.now();
        const withinCooldown = now - lastTriggerTsRef.current < COOLDOWN_MS;
        if (/\babra\s*cadabra\b/i.test(transcript)) {
          if (!inProgressRef.current && !isAnalyzing && !withinCooldown) {
            // Gate further triggers immediately
            inProgressRef.current = true;
            lastTriggerTsRef.current = now;
            setTranscriptText("");
            // Start analysis pipeline
            captureFrame();
          }
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Auto-restart to keep always listening (unless we paused for TTS)
        if (autoRestartRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      // Attempt to start listening immediately
      try {
        recognition.start();
      } catch {}
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // No manual controls; recognition runs continuously

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

            <div className="w-full text-center text-sm text-purple-200/80">
              {isAnalyzing ? (
                <div className="inline-flex items-center gap-2">
                  <span>✨ Analyzing with AI Magic...</span>
                  <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <span>Say "Abra cadabra" to trigger analysis</span>
              )}
            </div>
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
                <>
                  <div className="text-lg text-emerald-100 leading-relaxed mb-4">
                    {aiInterpretation.text}
                  </div>
                  <div className="text-center text-sm text-emerald-200/80">
                    Analysis will be read aloud automatically.
                  </div>
                </>
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

        {/* Conversation UI removed for hands-free flow */}

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
                <span>Say "Abra cadabra" to trigger analysis</span>
              </li>
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  4
                </span>
                <span>
                  Wait for the AI wizard to analyze your magical brewing!
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  5
                </span>
                <span>
                  The wizard will read the analysis aloud automatically
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  6
                </span>
                <span>
                  The wizard will speak the analysis aloud, then listen for your
                  voice - ask questions, share thoughts, or learn about magical
                  brewing!
                </span>
              </li>
            </ol>

            <div className="mt-6 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>🎤 Voice Feature:</strong> Make sure your browser has
                microphone permissions enabled for the best magical conversation
                experience!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
