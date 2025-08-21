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
 * Generate speech from text using Gemini TTS via Netlify Functions
 */
export async function generateSpeech(text: string): Promise<SpeechResponse> {
  try {
    const response = await fetch("/.netlify/functions/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "TTS generation failed");
    }

    return result;
  } catch (error) {
    console.error("Error generating speech:", error);
    // Throw error instead of graceful fallback as requested
    throw new Error(
      error instanceof Error ? error.message : "TTS generation failed"
    );
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

    // Generate speech using Gemini TTS API
    // If TTS fails, the error will be thrown and caught by the outer try-catch
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
