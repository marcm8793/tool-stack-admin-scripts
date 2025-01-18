import * as functions from "firebase-functions";

export const triggerDailySync = functions.pubsub
  .schedule("0 12 * * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    console.log("triggerDailySync function started");
    try {
      const region = functions.config().project.region;
      const projectId = functions.config().project.id;

      // Call both sync endpoints
      const syncUrls = [
        `https://${region}-${projectId}.cloudfunctions.net/fullSyncToolsToTypesense`,
        `https://${region}-${projectId}.cloudfunctions.net/fullSyncToolsToPinecone`,
      ];

      for (const url of syncUrls) {
        console.log(`Calling sync URL: ${url}`);
        const response = await fetch(url);
        console.log(`Response status: ${response.status}`);
        console.log(`Response text: ${await response.text()}`);
      }

      return null;
    } catch (error) {
      console.error("Error in triggerDailySync:", error);
      throw error;
    }
  });
