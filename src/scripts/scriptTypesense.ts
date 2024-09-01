import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Typesense from "typesense";
import dotenv from "dotenv";

dotenv.config();
admin.initializeApp();

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_PROD_HOST!,
      port: parseInt(process.env.TYPESENSE_PROD_PORT!),
      protocol: process.env.TYPESENSE_PROD_PROTOCOL!,
    },
  ],
  apiKey: process.env.TYPESENSE_PROD_API_KEY!,
  connectionTimeoutSeconds: 2,
});

export const syncToolsToTypesense = functions.firestore
  .document("tools/{toolId}")
  .onWrite(async (change, context) => {
    const toolData = change.after.exists ? change.after.data() : null;
    const toolId = context.params.toolId;

    try {
      if (!toolData) {
        // Tool was deleted, remove from Typesense
        await typesenseClient
          .collections("dev_tools")
          .documents(toolId)
          .delete();
        return null;
      }

      // Fetch category data
      const categoryRef = toolData.category;
      const categoryDoc = await categoryRef.get();
      const categoryData = categoryDoc.data();

      // Prepare the object to be indexed in Typesense
      const objectToIndex = {
        id: toolId,
        name: toolData.name,
        description: toolData.description,
        category: {
          id: categoryRef.id,
          name: categoryData?.name,
        },
        badges: toolData.badges,
        ecosystem: toolData.ecosystem,
        github_link: toolData.github_link,
        github_stars: toolData.github_stars,
        logo_url: toolData.logo_url,
        website_url: toolData.website_url,
        like_count: toolData.like_count,
      };

      // Add or update the tool in Typesense
      await typesenseClient
        .collections("dev_tools")
        .documents()
        .upsert(objectToIndex);

      console.log(`Successfully upserted tool with ID: ${toolId}`);
    } catch (error) {
      console.error(`Error processing tool with ID: ${toolId}`, error);
    }

    return null;
  });
