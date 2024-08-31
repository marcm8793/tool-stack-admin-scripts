import * as functions from "firebase-functions";

export const triggerDailySync = functions.pubsub
  .schedule("0 0 * * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    const region = process.env.FUNCTION_REGION;
    const fullSyncUrl = `https://${region}-${process.env.PROJECT_ID}.cloudfunctions.net/fullSyncToolsToTypesense`;
    await fetch(fullSyncUrl);
    return null;
  });
