import * as admin from "firebase-admin";
import Typesense from "typesense";
import * as functions from "firebase-functions";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import dotenv from "dotenv";

dotenv.config();
// Initialize Firebase Admin
// Make sure you have set up your service account key
const serviceAccount = require("../../pkFirebase-prod.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

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

const schema: CollectionCreateSchema = {
  name: "dev_tools",
  fields: [
    { name: "name", type: "string" },
    { name: "description", type: "string" },
    { name: "category", type: "string" },
    { name: "ecosystem", type: "string" },
    { name: "badges", type: "string[]" },
    { name: "github_link", type: "string" },
    { name: "github_stars", type: "int32" },
    { name: "logo_url", type: "string" },
    { name: "website_url", type: "string" },
    { name: "like_count", type: "int32" },
  ],
};

async function createCollectionIfNotExists() {
  try {
    await typesenseClient.collections("dev_tools").retrieve();
    console.log("Collection 'dev_tools' already exists");
  } catch (error) {
    if (
      error instanceof Error &&
      "httpStatus" in error &&
      error.httpStatus === 404
    ) {
      await typesenseClient.collections().create(schema);
      console.log("Created 'dev_tools' collection");
    } else {
      console.error("Unexpected error:", error);
      throw error;
    }
  }
}

async function syncDataToTypesense() {
  await createCollectionIfNotExists();

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
      category: categoryDoc.data().name,
      ecosystem: ecosystemDoc.data().name,
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
