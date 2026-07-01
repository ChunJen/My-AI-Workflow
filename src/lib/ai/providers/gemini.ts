import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  if (!text) throw new Error("No content returned from Gemini");
  return text;
}
