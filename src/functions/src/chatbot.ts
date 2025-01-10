/* eslint-disable indent */
/* eslint-disable operator-linebreak */
/* eslint-disable object-curly-spacing */
import * as functions from "firebase-functions";
import OpenAI from "openai";
import { pineconeClient } from "./config/pinecone";

const apiKey = functions.config().openai.key;
const openai = new OpenAI({ apiKey });
const INDEX_NAME = "toolstack-tools-dev";

export const generateChatResponse = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    // Input validation
    const { messages, toolQuery } = data;
    if (!messages || !toolQuery) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Messages and toolQuery are required"
      );
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: toolQuery,
        dimensions: 1536,
      });

      // Search Pinecone for relevant tools
      const index = pineconeClient.index(INDEX_NAME);
      const searchResults = await index.query({
        vector: queryEmbedding.data[0].embedding,
        topK: 5,
        includeMetadata: true,
      });

      // Prepare context from relevant tools
      const context = searchResults.matches
        .map((match) => {
          const tool = match.metadata;
          if (!tool) return "";
          return `Tool: ${tool.name}
              Description: ${tool.description}
              Category: ${tool.category}
              Ecosystem: ${tool.ecosystem}    ${
            tool.badges && Array.isArray(tool.badges)
              ? `Tags: ${tool.badges.join(", ")}`
              : ""
          }`;
        })
        .join("\n\n");

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

            If you don't find relevant information in the context, you can
            provide general guidance about developer tools.
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
