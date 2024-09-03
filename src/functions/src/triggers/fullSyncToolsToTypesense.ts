/* eslint-disable operator-linebreak */
/* eslint-disable object-curly-spacing */
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { typesenseClient } from "../config/typesense";
import { sendTelegramMessage } from "../config/telegram";
import { TypesenseError } from "typesense/lib/Typesense/Errors";

export const fullSyncToolsToTypesense = functions
  .runWith({
    timeoutSeconds: 540, // Firebase-specific configuration
    memory: "1GB",
  })
  .https.onRequest(async (request, response) => {
    const logMessages = [];
    let totalTools = 0;
    let updatedTools = 0;
    let addedTools = 0;

    try {
      const toolsSnapshot = await admin.firestore().collection("tools").get();
      logMessages.push(`Starting full sync of ${toolsSnapshot.size} tools.`);
      totalTools = toolsSnapshot.size;

      for (const doc of toolsSnapshot.docs) {
        const toolData = doc.data();
        const toolId = doc.id;

        // Fetch category data
        const categoryDoc = await toolData.category.get();
        const categoryData = categoryDoc.data();

        // Fetch ecosystem data
        const ecosystemDoc = await toolData.ecosystem.get();
        const ecosystemData = ecosystemDoc.data();

        const objectToIndex = {
          id: toolId,
          name: toolData.name,
          description: toolData.description,
          category: categoryData.name,
          ecosystem: ecosystemData.name,
          badges: toolData.badges,
          github_link: toolData.github_link,
          github_stars: toolData.github_stars,
          logo_url: toolData.logo_url,
          website_url: toolData.website_url,
          like_count: toolData.like_count || 0,
        };

        // Check if the tool exists in Typesense
        try {
          const existingTool = await typesenseClient
            .collections("dev_tools")
            .documents(toolId)
            .retrieve();

          // Compare existing data with new data
          if (JSON.stringify(existingTool) !== JSON.stringify(objectToIndex)) {
            await typesenseClient
              .collections("dev_tools")
              .documents(toolId)
              .update(objectToIndex);
            updatedTools++;
          }
        } catch (error) {
          // If the tool doesn't exist in Typesense, add it
          if (error instanceof TypesenseError && error.httpStatus === 404) {
            await typesenseClient
              .collections("dev_tools")
              .documents()
              .create(objectToIndex);
            addedTools++;
          } else {
            throw error;
          }
        }
      }

      // Verify the number of tools in Typesense
      const typesenseToolsCount = await typesenseClient
        .collections("dev_tools")
        .documents()
        .search({
          q: "*",
          per_page: 0,
        });

      const syncStatus =
        totalTools === typesenseToolsCount.found
          ? "Sync successful: Firestore and Typesense tool counts match."
          : "Sync completed, but tool counts don't match. Please investigate.";

      const summaryMessage = `
- Total tools in Firestore: ${totalTools}
- Tools updated in Typesense: ${updatedTools}
- Tools added to Typesense: ${addedTools}
- Total tools in Typesense: ${typesenseToolsCount.found}
${syncStatus}
`.trim();

      console.log(summaryMessage);
      await sendTelegramMessage(logMessages.join("\n"));
      await sendTelegramMessage(summaryMessage);

      response.status(200).send("Full sync completed successfully");
    } catch (error) {
      console.error("Error during full sync:", error);
      response.status(500).send("Error during full sync");
      logMessages.push(`Error during full sync: ${error}`);
    }
  });
