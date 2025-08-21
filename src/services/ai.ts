// AI service for Magic Cauldron
// Using Netlify Functions to avoid CORS issues with static deployment

export interface AIInterpretation {
  text: string;
  success: boolean;
  error?: string;
}

export interface SpeechResponse {
  audioData: string; // base64 encoded audio
  success: boolean;
  error?: string;
}

export interface ConversationResponse {
  text: string;
  audioData?: string;
  success: boolean;
  error?: string;
}

/**
 * Convert canvas to base64 image data
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
}

/**
 * Interpret an image using Netlify Functions (to avoid CORS issues)
 */
export async function interpretImage(
  canvas: HTMLCanvasElement
): Promise<AIInterpretation> {
  try {
    const base64Data = canvasToBase64(canvas);

    const response = await fetch("/.netlify/functions/interpret-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageData: base64Data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error interpreting image:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate speech from text using Web Speech API (client-side TTS)
 * This is a fallback solution for static sites since server-side TTS has CORS issues
 */
export async function generateSpeech(text: string): Promise<SpeechResponse> {
  try {
    // Check if Web Speech API is supported
    if (!("speechSynthesis" in window)) {
      return {
        success: false,
        audioData: "",
        error: "Speech synthesis not supported in this browser.",
      };
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Try to find a more magical/mystical voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.name.toLowerCase().includes("alex") ||
            voice.name.toLowerCase().includes("daniel") ||
            voice.name.toLowerCase().includes("samantha")
        ) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 0.9; // Slightly slower for mystical effect
      utterance.pitch = 0.8; // Slightly lower pitch

      utterance.onend = () => {
        resolve({
          success: true,
          audioData: "", // Web Speech API doesn't return audio data
        });
      };

      utterance.onerror = (error) => {
        resolve({
          success: false,
          audioData: "",
          error: `Speech synthesis failed: ${error.error}`,
        });
      };

      speechSynthesis.speak(utterance);
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return {
      success: false,
      audioData: "",
      error:
        error instanceof Error ? error.message : "Speech generation failed",
    };
  }
}

/**
 * Handle conversational AI responses using Netlify Functions
 */
export async function handleConversation(
  userInput: string,
  conversationHistory: string[] = []
): Promise<ConversationResponse> {
  try {
    const response = await fetch("/.netlify/functions/conversation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userInput,
        conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Generate speech using client-side Web Speech API
    const speechResult = await generateSpeech(result.text);

    return {
      ...result,
      audioData: speechResult.success ? speechResult.audioData : undefined,
    };
  } catch (error) {
    console.error("Error in conversation:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Conversation failed",
    };
  }
}
