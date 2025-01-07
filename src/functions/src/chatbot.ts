/* eslint-disable object-curly-spacing */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";

const apiKey = functions.config().openai.key;

const openai = new OpenAI({
  apiKey,
});

export const generateChatResponse = functions.https.onCall(
  async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const { messages, toolQuery } = data;

    try {
      // Query Firestore for relevant tools
      const toolsRef = admin.firestore().collection("tools");
      const toolsSnapshot = await toolsRef
        .where("description", ">=", toolQuery.toLowerCase())
        .where("description", "<=", toolQuery.toLowerCase() + "\uf8ff")
        .limit(5)
        .get();

      // Prepare context from tools
      const context = toolsSnapshot.docs
        .map((doc) => {
          const tool = doc.data();
          return `Tool: ${tool.name}\nDescription: ${
            tool.description
          }\nCategory: ${tool.category?.name || "N/A"}\n`;
        })
        .join("\n");

      // Generate OpenAI response
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant for ToolStack, a platform for
                      discovering developer tools.
          Use the following context about tools to answer questions:
          ${context}

          If you don't find relevant information in the context, you can provide
          general guidance about developer tools.
          Always be friendly and concise in your responses.`,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      return {
        message: response.choices[0].message.content,
      };
    } catch (error) {
      console.error("Error:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate response"
      );
    }
  }
);
