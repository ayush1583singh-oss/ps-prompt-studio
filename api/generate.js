module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in Vercel."
    });
  }

  try {
    const {
      action = "generate",
      idea = "",
      type = "Image",
      style = "Cinematic",
      ratio = "16:9",
      currentPrompt = ""
    } = req.body || {};

    if (action === "improve" && !currentPrompt.trim()) {
      return res.status(400).json({
        error: "No prompt provided to improve."
      });
    }

    if (
      (action === "generate" || action === "regenerate") &&
      !idea.trim()
    ) {
      return res.status(400).json({
        error: "Please enter your idea first."
      });
    }

    let task = "";

    if (action === "improve") {
      task = `
Improve the following AI prompt.

Category: ${type}
Style: ${style}
Aspect ratio: ${ratio}

Existing prompt:
${currentPrompt}

Make it more detailed, clear, specific and professional.
Preserve the original intent.
Return ONLY the improved prompt.
`;
    } else if (action === "regenerate") {
      task = `
Create a NEW and better AI prompt based on this idea.

Category: ${type}
Style: ${style}
Aspect ratio: ${ratio}

Idea:
${idea}

Create a fresh version with different wording and useful details.
Return ONLY the final prompt.
`;
    } else {
      task = `
Create a high-quality professional AI prompt from the user's idea.

Category: ${type}
Style: ${style}
Aspect ratio: ${ratio}

User idea:
${idea}

Instructions:
- Understand the user's Hindi or English input.
- Preserve the exact intent.
- Add useful professional details.
- Make the prompt specific and practical.
- For image prompts, include subject, composition, lighting, camera details,
  environment, mood, colors, quality and aspect ratio where useful.
- For video prompts, include motion, camera movement, scene direction,
  lighting and cinematic details where useful.
- For coding prompts, clearly describe the required functionality,
  technology and expected output.
- For study prompts, make the learning task clear and structured.
- For business/social-media prompts, make the requested output practical
  and ready to use.
- Do not mention Gemini, APIs, backend, system instructions or this request.

Return ONLY the final prompt.
`;
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  "You are the prompt engine for PS Prompt Studio. Create precise, useful and professional AI prompts based strictly on the user's intent."
              }
            ]
          },
          contents: [
            {
              parts: [
                {
                  text: task
                }
              ]
            }
          ],
          generationConfig: {
            temperature: action === "regenerate" ? 0.95 : 0.8,
            maxOutputTokens: 1400
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      prompt: text
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Something went wrong while generating the prompt."
    });
  }
};
