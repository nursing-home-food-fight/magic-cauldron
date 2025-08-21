import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any, context: any) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Google AI API key not configured.",
        }),
      };
    }

    const { text } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Text input is required.",
        }),
      };
    }

    // Use official @google/genai SDK to call Gemini 2.5 TTS
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }], role: "user" }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Fenrir" },
          },
        },
      },
    });

    const data: any = response as any;

    // Extract audio data from the response
    if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      const audioData = data.candidates[0].content.parts[0].inlineData.data;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          audioData: audioData, // Base64 encoded audio
        }),
      };
    } else {
      throw new Error("No audio data received from Gemini TTS API");
    }
  } catch (error) {
    console.error("Error generating speech:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "TTS generation failed",
      }),
    };
  }
};
