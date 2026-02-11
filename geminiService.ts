
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Fix: Implement summarization using Gemini API as per coding guidelines
/**
 * Summarizes the work description using the Gemini 3 Flash model.
 * @param description The raw description of the work performed.
 * @returns A concise professional summary in Italian.
 */
export const summarizeWorkDescription = async (description: string): Promise<string> => {
  if (!description || description.trim().length < 5) return "";

  // Always initialize GoogleGenAI inside the function using the process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Basic text summarization task: use 'gemini-3-flash-preview'
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Riassumi professionalmente in italiano questa descrizione di un lavoro di cantiere in massimo 10 parole: "${description}"`,
    });
    
    // Access the .text property directly (not a method) as per current SDK
    const text = response.text;
    return text ? text.trim() : description.substring(0, 50);
  } catch (error) {
    console.error("Gemini summary error:", error);
    // Fallback if AI summarization fails
    return description.substring(0, 50);
  }
};
