import * as functions from "firebase-functions";

export const triggerDailySync = functions.pubsub
  .schedule("0 12 * * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    console.log("triggerDailySync function started");
    try {
      const region = functions.config().project.region;
      const projectId = functions.config().project.id;
      console.log("Region:", region);
      console.log("Project ID:", projectId);
      const fullSyncUrl = `https://${region}-${projectId}.cloudfunctions.net/fullSyncToolsToTypesense`;
      console.log("Full sync URL:", fullSyncUrl);
      const response = await fetch(fullSyncUrl);
      console.log("Fetch response status:", response.status);
      console.log("Fetch response text:", await response.text());
      return null;
    } catch (error) {
      console.error("Error in triggerDailySync:", error);
      throw error;
    }
  });
