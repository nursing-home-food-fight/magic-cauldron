export const handler = async (event: any) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: "Method not allowed" }),
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: "OPENAI_API_KEY not configured.",
        }),
      };
    }

    const { text, voice, format = "mp3" } = JSON.parse(event.body || "{}");
    if (!text || typeof text !== "string") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: "Text is required" }),
      };
    }

    // Try multiple voices in parallel; pick the preferred successful one
    const voicesToTry: string[] = voice
      ? [voice]
      : ["aria", "alloy", "verse", "luna", "coral"];

    const preferredOrder: Record<string, number> = {
      aria: 5,
      alloy: 4,
      verse: 3,
      luna: 2,
      coral: 1,
    };

    const callTts = async (v: string) => {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: v,
          input: text,
          format,
        }),
      });
      if (!res.ok) {
        throw new Error(`TTS failed for ${v}: ${res.status}`);
      }
      const buf = await res.arrayBuffer();
      return { voice: v, audio: Buffer.from(buf).toString("base64") };
    };

    const results = await Promise.allSettled(
      voicesToTry.map((v) => callTts(v))
    );
    const successes = results
      .filter(
        (r): r is PromiseFulfilledResult<{ voice: string; audio: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value)
      .sort(
        (a, b) =>
          (preferredOrder[b.voice] || 0) - (preferredOrder[a.voice] || 0)
      );

    if (successes.length === 0) {
      const firstErr = results.find((r) => r.status === "rejected") as
        | PromiseRejectedResult
        | undefined;
      const errMsg = firstErr?.reason?.message || "All TTS attempts failed";
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ success: false, error: errMsg }),
      };
    }

    const best = successes[0];
    const mimeType =
      format === "wav"
        ? "audio/wav"
        : format === "ogg"
        ? "audio/ogg"
        : "audio/mpeg";
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, audioData: best.audio, mimeType }),
    };
  } catch (error) {
    console.error("Error in TTS:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "TTS failed",
      }),
    };
  }
};
