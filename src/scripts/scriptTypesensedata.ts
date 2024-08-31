import * as admin from "firebase-admin";
import Typesense from "typesense";
import * as functions from "firebase-functions";

// Initialize Firebase Admin
// Make sure you have set up your service account key
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: functions.config().typesense.host,
      port: parseInt(functions.config().typesense.port, 10),
      protocol: functions.config().typesense.protocol,
    },
  ],
  apiKey: functions.config().typesense.apikey,
  connectionTimeoutSeconds: 2,
});
async function syncDataToTypesense() {
  const toolsRef = db.collection("tools");
  const snapshot = await toolsRef.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Fetch category and ecosystem data
    const categoryDoc = await data.category.get();
    const ecosystemDoc = await data.ecosystem.get();

    // Format the data for Typesense
    const typesenseDoc = {
      id: doc.id,
      name: data.name,
      description: data.description,
      category: categoryDoc.data().name, // Assuming you want to store the category name
      ecosystem: ecosystemDoc.data().name, // Assuming you want to store the ecosystem name
      badges: data.badges,
      github_link: data.github_link,
      github_stars: data.github_stars,
      logo_url: data.logo_url,
      website_url: data.website_url,
      like_count: data.like_count || 0,
    };

    try {
      await typesenseClient
        .collections("dev_tools")
        .documents()
        .upsert(typesenseDoc);
      console.log(`Synced document ${doc.id}`);
    } catch (error) {
      console.error(`Error syncing document ${doc.id}:`, error);
    }
  }
}

syncDataToTypesense()
  .then(() => {
    console.log("Sync completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Sync failed:", error);
    process.exit(1);
  });
