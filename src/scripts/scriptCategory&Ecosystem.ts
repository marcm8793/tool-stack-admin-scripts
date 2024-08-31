import * as admin from "firebase-admin";
import * as fs from "fs";

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Define types for Category and Ecosystem
interface Category {
  category_id: string;
  name: string;
  [key: string]: string;
}

interface Ecosystem {
  ecosystem_id: string;
  name: string;
  [key: string]: string;
}

// Function to add data to Firestore
async function addData<T extends { [key: string]: string }>(
  collectionName: string,
  data: T[],
  idField: string
) {
  const batch = db.batch();
  data.forEach((item) => {
    const docRef = db.collection(collectionName).doc(item[idField]);
    batch.set(docRef, item);
  });
  await batch.commit();
  console.log(`Added ${data.length} items to ${collectionName}`);
}
// Here's how you could modify the addData function to check for existence
// and only add new documents: (but slow)
// async function addData<T extends { [key: string]: string }>(
//   collectionName: string,
//   data: T[],
//   idField: string
// ) {
//   const batch = db.batch();
//   for (const item of data) {
//     const docRef = db.collection(collectionName).doc(item[idField]);
//     const doc = await docRef.get();
//     if (!doc.exists) {
//       batch.set(docRef, item);
//     } else {
//       console.log(`Document ${item[idField]} already exists in ${collectionName}. Skipping.`);
//     }
//   }
//   await batch.commit();
//   console.log(`Added new items to ${collectionName}`);
// }

// Main function to populate the database with categories and ecosystems
async function populateDatabase() {
  try {
    // Read categories from JSON file
    const categoriesData: string = fs.readFileSync(
      "./data/categories.json",
      "utf-8"
    );
    const categories: Category[] = JSON.parse(categoriesData);

    // Read ecosystems from JSON file
    const ecosystemsData: string = fs.readFileSync(
      "./data/ecosystems.json",
      "utf-8"
    );
    const ecosystems: Ecosystem[] = JSON.parse(ecosystemsData);

    // Add categories to Firestore
    await addData("categories", categories, "category_id");

    // Add ecosystems to Firestore
    await addData("ecosystems", ecosystems, "ecosystem_id");

    console.log("Database population completed successfully");
  } catch (error) {
    console.error("Error populating database:", error);
  } finally {
    // Close the Firebase Admin SDK connection
    admin.app().delete();
  }
}

// Run the population script
populateDatabase();
