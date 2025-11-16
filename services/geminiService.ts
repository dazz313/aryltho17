import { GoogleGenAI } from "@google/genai";
// FIX: Corrected import path for ChatMessage from root types file.
import { ChatMessage } from '../types';

export const generateAiSummary = async (data: any): Promise<string> => {
  if (!process.env.API_KEY) {
    return Promise.resolve("API Key not configured. Please set the API_KEY environment variable. Displaying mock data instead.\n\n**Analysis of Business Operations:**\n\n*   **Top Performing Technician:** Budi Santoso completed the most work orders this period.\n*   **Most Common Service:** 'AC Not Cooling' is the most frequent issue reported by customers.\n*   **Revenue Trend:** There is a positive upward trend in monthly revenue over the last quarter.\n*   **Recommendation:** Consider stocking more 'Compressor XYZ' spare parts due to high usage and offer a promotional package for AC cleaning services to boost off-season revenue.");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Analyze the following JSON data from a service business CRM. Provide a concise business summary in Markdown format.
      The summary should include:
      1.  The top-performing technician based on the number of completed work orders.
      2.  The most common service request description.
      3.  A brief analysis of financial performance (revenue vs. expenses).
      4.  A scannable, actionable recommendation for business improvement.
      
      Use Indonesian Rupiah (IDR) for all currency values.

      Here is the data:
      ${JSON.stringify(data, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "Failed to generate AI summary. Please check the console for details.";
  }
};

export const getChatbotResponse = async (
  history: ChatMessage[],
  context: any
): Promise<string> => {
  if (!process.env.API_KEY) {
    return Promise.resolve(
      "API Key not configured. I can't answer questions right now. Here's a mock response:\n\nThere are **2 pending work orders** and the total value of unpaid invoices is **IDR 850,000**."
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const systemInstruction = `
      You are an expert AI assistant integrated into "ServisPro CRM". Your name is ServisAI.
      Your purpose is to help the user by answering questions about their business data.
      You must be concise, helpful, and use a professional but friendly tone.
      Use Markdown for formatting, especially for lists and bolding key information.
      Use Indonesian Rupiah (IDR) for all currency values.

      IMPORTANT: You are speaking to the following user:
      - User Name: ${context.currentUser.name}
      - User Role: ${context.currentUser.role}
      
      You have access to the following real-time business data. Use it to answer user questions. Do NOT mention that you are using JSON data. Just answer the question naturally.

      CURRENT DATA:
      ${JSON.stringify({
        customers: context.customers,
        workOrders: context.workOrders,
        spareParts: context.spareParts,
        invoices: context.invoices,
        technicians: context.technicians,
      }, null, 2)}
    `;
    
    // FIX: Switched from a single string to a structured array of Content objects for chat history.
    // This is the correct way to pass conversational context to the Gemini API.
    const contents = history.map(msg => ({
      role: msg.sender === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Error getting chatbot response:", error);
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
};
