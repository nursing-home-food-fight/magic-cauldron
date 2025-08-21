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

    const { userInput, conversationHistory = [] } = JSON.parse(event.body);

    if (!userInput) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: "User input is required.",
        }),
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    // Build conversation context
    const historyContext =
      conversationHistory.length > 0
        ? `Previous conversation:\n${conversationHistory.join("\n")}\n\n`
        : "";

    const prompt = `
${historyContext}You are a wise and whimsical AI wizard who has just analyzed what's in a magical cauldron. You're now having a friendly conversation with the user about the magical brewing process.

The user just said: "${userInput}"

Respond in character as a mystical wizard. Be engaging, magical, and helpful. You can:
- Answer questions about what you observed in the cauldron
- Suggest magical ingredients or brewing techniques
- Share mystical wisdom or fun facts
- Ask engaging questions about their magical journey
- Be playful and creative while staying family-friendly

Keep responses conversational and not too long (2-3 sentences typically).
    `.trim();

    const result = await model.generateContent([prompt]);
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
    console.error("Error in conversation:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Conversation failed",
      }),
    };
  }
};
