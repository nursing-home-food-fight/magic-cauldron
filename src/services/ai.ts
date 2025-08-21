import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google AI client
// Note: For static exports, the API key is embedded at build time
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export interface AIInterpretation {
  text: string;
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
 * Interpret an image using Gemini 2.5 Flash
 */
export async function interpretImage(
  canvas: HTMLCanvasElement
): Promise<AIInterpretation> {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return {
        success: false,
        text: "",
        error:
          "Google AI API key not configured. Please set GOOGLE_AI_API_KEY environment variable.",
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const base64Data = canvasToBase64(canvas);

    const prompt = `
You are a magical AI assistant analyzing what's happening in this cauldron! 

Look at this image and provide a fun, mystical interpretation of what you see. Be creative and magical in your response, as if you're a wise wizard observing a magical brewing process. 

Consider:
- What objects or ingredients do you see?
- What colors are present and what might they represent magically?
- What kind of potion or spell might be brewing?
- Any magical effects or transformations happening?

Respond in a whimsical, magical tone as if you're narrating a spell in progress. Keep it family-friendly and fun!
    `.trim();

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      text,
    };
  } catch (error) {
    console.error("Error interpreting image:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
