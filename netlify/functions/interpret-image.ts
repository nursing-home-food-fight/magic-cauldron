import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

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

    const { imageData } = JSON.parse(event.body);

    if (!imageData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Image data is required.",
        }),
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a magical AI assistant analyzing what's happening in this cauldron! 

Look at this image and from it, brew an enchanting and realistic recipe for a strengthening and nourishing meal.

Consider:
- What objects or ingredients do you see?
- What colors are present and what might they represent magically?
- Any magical effects this recipe might incur?

Feel free to ask for any additional information you need to brew the recipe, like what ingredients are available, what the user's preferences are, etc.

Keep your response short, no more than two sentances. The User will follow up with you.

Respond in a whimsical, magical tone as if you're narrating a spell in progress. Keep it family-friendly and fun! Do not include anything other than text, this will be read out as a speech.
    `.trim();

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        text,
      }),
    };
  } catch (error) {
    console.error("Error interpreting image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
    };
  }
};
