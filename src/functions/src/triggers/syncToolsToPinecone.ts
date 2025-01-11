/* eslint-disable operator-linebreak */
/* eslint-disable object-curly-spacing */
import * as functions from "firebase-functions";
import { pineconeClient } from "../config/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: functions.config().openai.key,
});

const INDEX_NAME = functions.config().environment.prod
  ? "toolstack-tools-prod"
  : "toolstack-tools-dev";

// eslint-disable-next-line require-jsdoc
async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export const syncToolsToPinecone = functions.firestore
  .document("tools/{toolId}")
  .onWrite(async (change, context) => {
    const toolData = change.after.exists ? change.after.data() : null;
    const toolId = context.params.toolId;
    const index = pineconeClient.index(INDEX_NAME);

    try {
      if (!toolData) {
        // Tool was deleted, remove from Pinecone
        await index.deleteOne(toolId);
        return null;
      }

      // Fetch category and ecosystem data
      const categoryDoc = await toolData.category.get();
      const ecosystemDoc = await toolData.ecosystem.get();
      const categoryData = categoryDoc.data();
      const ecosystemData = ecosystemDoc.data();

      // Create the text to be embedded
      const textToEmbed = `
        Tool: ${toolData.name}
        Description: ${toolData.description}
        Category: ${categoryData.name}
        Ecosystem: ${ecosystemData.name}
        ${toolData.badges ? `Tags: ${toolData.badges.join(", ")}` : ""}
      `.trim();

      // Generate embedding
      const embedding = await getEmbedding(textToEmbed);

      // Upsert to Pinecone
      await index.upsert([
        {
          id: toolId,
          values: embedding,
          metadata: {
            name: toolData.name,
            description: toolData.description,
            category: categoryData.name,
            ecosystem: ecosystemData.name,
            badges: toolData.badges,
            github_link: toolData.github_link,
            github_stars: toolData.github_stars,
            website_url: toolData.website_url,
          },
        },
      ]);

      console.log(`Successfully synced tool ${toolId} to Pinecone`);
    } catch (error) {
      console.error(`Error syncing tool ${toolId} to Pinecone:`, error);
    }

    return null;
  });
