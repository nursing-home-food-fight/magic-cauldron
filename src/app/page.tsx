"use client";

import { useEffect, useRef, useState } from "react";
import {
  interpretImage,
  handleConversation,
  generateSpeech,
  type AIInterpretation,
  type ConversationResponse,
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
  const [isInConversation, setIsInConversation] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [currentResponse, setCurrentResponse] =
    useState<ConversationResponse | null>(null);
  const [transcriptText, setTranscriptText] = useState("");

  // Speech recognition ref
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  // Speech playback function for Gemini TTS audio or fallback to browser TTS
  const speakText = (text: string, audioData?: string) => {
    if (audioData) {
      // Use Gemini TTS audio data
      try {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
          {
            type: "audio/wav",
          }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setIsSpeaking(true);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (isInConversation) {
            // Start listening for user response after AI finishes speaking
            startListening();
          }
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          console.error(
            "Error playing Gemini TTS audio, falling back to browser TTS"
          );
          // Fallback to browser TTS
          speakWithBrowserTTS(text);
        };

        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          // Fallback to browser TTS
          speakWithBrowserTTS(text);
        });
      } catch (error) {
        console.error("Error processing Gemini TTS audio:", error);
        // Fallback to browser TTS
        speakWithBrowserTTS(text);
      }
    } else {
      // Fallback to browser TTS
      speakWithBrowserTTS(text);
    }
  };

  // Browser TTS fallback function
  const speakWithBrowserTTS = (text: string) => {
    if ("speechSynthesis" in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      synthesisRef.current = utterance;

      // Configure voice to sound mystical
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;

      // Try to find a suitable voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("female") ||
          voice.name.toLowerCase().includes("natural")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (isInConversation) {
          // Start listening for user response after AI finishes speaking
          startListening();
        }
      };
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Speech recognition setup
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
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

        if (event.results[event.results.length - 1].isFinal) {
          handleUserInput(transcript);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
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

  // Start listening for user input
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Handle user voice input
  const handleUserInput = async (userInput: string) => {
    if (!userInput.trim()) return;

    try {
      const response = await handleConversation(userInput, conversationHistory);
      setCurrentResponse(response);

      if (response.success) {
        // Update conversation history
        setConversationHistory((prev) => [
          ...prev,
          `User: ${userInput}`,
          `AI: ${response.text}`,
        ]);

        // Speak the AI response with Gemini TTS audio
        speakText(response.text, response.audioData);
      }
    } catch (error) {
      console.error("Error handling user input:", error);
    }
  };

  // Start conversation after initial image analysis
  const startConversation = async () => {
    if (aiInterpretation?.success) {
      setIsInConversation(true);
      setConversationHistory([]);

      // Generate speech for the initial interpretation using Gemini TTS
      try {
        const speechResponse = await generateSpeech(aiInterpretation.text);
        if (speechResponse.success) {
          speakText(aiInterpretation.text, speechResponse.audioData);
        } else {
          // Fallback to browser TTS if Gemini TTS fails
          speakText(aiInterpretation.text);
        }
      } catch (error) {
        console.error(
          "Error generating speech for initial interpretation:",
          error
        );
        // Fallback to browser TTS
        speakText(aiInterpretation.text);
      }
    }
  };

  // End conversation
  const endConversation = () => {
    setIsInConversation(false);
    setConversationHistory([]);
    setCurrentResponse(null);
    setTranscriptText("");
    stopListening();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
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
                <>
                  <div className="text-lg text-emerald-100 leading-relaxed mb-4">
                    {aiInterpretation.text}
                  </div>
                  {!isInConversation && (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={startConversation}
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                      >
                        🎙️ Start Magical Conversation
                      </button>
                    </div>
                  )}
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

        {/* Conversation Section */}
        {isInConversation && (
          <div className="mt-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-violet-800/50 to-purple-800/50 backdrop-blur-sm rounded-xl p-6 border border-violet-400/30">
              <h2 className="text-2xl font-bold text-center mb-4 text-violet-400">
                🗣️ Magical Conversation 🗣️
              </h2>

              {/* Conversation Status */}
              <div className="flex justify-center items-center gap-4 mb-6">
                {isSpeaking && (
                  <div className="flex items-center gap-2 bg-blue-900/50 px-4 py-2 rounded-lg border border-blue-400/30">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-200">
                      🧙‍♂️ Wizard is speaking...
                    </span>
                  </div>
                )}

                {isListening && (
                  <div className="flex items-center gap-2 bg-green-900/50 px-4 py-2 rounded-lg border border-green-400/30">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-200">
                      🎤 Listening for your voice...
                    </span>
                  </div>
                )}

                {!isSpeaking && !isListening && (
                  <div className="flex items-center gap-2 bg-purple-900/50 px-4 py-2 rounded-lg border border-purple-400/30">
                    <span className="text-purple-200">
                      ✨ Ready for conversation
                    </span>
                  </div>
                )}
              </div>

              {/* Live Transcript */}
              {isListening && transcriptText && (
                <div className="mb-4 bg-gray-900/50 rounded-lg p-4 border border-gray-600">
                  <p className="text-gray-300 text-sm mb-1">You're saying:</p>
                  <p className="text-white font-medium italic">
                    "{transcriptText}"
                  </p>
                </div>
              )}

              {/* Current AI Response */}
              {currentResponse && currentResponse.success && (
                <div className="mb-4 bg-indigo-900/50 rounded-lg p-4 border border-indigo-400/30">
                  <p className="text-indigo-300 text-sm mb-2">
                    🧙‍♂️ Wizard says:
                  </p>
                  <p className="text-indigo-100 text-lg leading-relaxed">
                    {currentResponse.text}
                  </p>
                </div>
              )}

              {/* Conversation Controls */}
              <div className="flex justify-center gap-4">
                {!isListening && !isSpeaking && (
                  <button
                    type="button"
                    onClick={startListening}
                    className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                  >
                    🎤 Speak to Wizard
                  </button>
                )}

                {isListening && (
                  <button
                    type="button"
                    onClick={stopListening}
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                  >
                    ✋ Stop Listening
                  </button>
                )}

                <button
                  type="button"
                  onClick={endConversation}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  🏁 End Conversation
                </button>
              </div>

              {/* Conversation History */}
              {conversationHistory.length > 0 && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-violet-300 hover:text-violet-200 font-medium">
                    📜 View Conversation History (
                    {conversationHistory.length / 2} exchanges)
                  </summary>
                  <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                    {conversationHistory.map((entry, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          entry.startsWith("User:")
                            ? "bg-blue-900/30 border-l-4 border-blue-400"
                            : "bg-purple-900/30 border-l-4 border-purple-400"
                        }`}
                      >
                        <p className="text-sm opacity-90">{entry}</p>
                      </div>
                    ))}
                  </div>
                </details>
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
              <li className="flex items-start gap-4">
                <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                  5
                </span>
                <span>
                  Click{" "}
                  <strong className="text-yellow-400">
                    "Start Magical Conversation"
                  </strong>{" "}
                  to begin talking with the AI wizard
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
