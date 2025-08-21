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
  mimeType?: string;
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
 * Generate speech via Netlify Function (OpenAI TTS)
 */
export async function generateSpeech(text: string): Promise<SpeechResponse> {
  try {
    const response = await fetch("/.netlify/functions/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      return {
        success: false,
        audioData: "",
        error: `HTTP ${response.status}`,
      };
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error("Error generating speech:", error);
    return {
      success: false,
      audioData: "",
      error: error instanceof Error ? error.message : "TTS failed",
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

    // Generate speech via server TTS
    const speechResult = await generateSpeech(result.text);

    return {
      ...result,
      audioData: speechResult.audioData,
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
