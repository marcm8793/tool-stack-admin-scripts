/* eslint-disable object-curly-spacing */
import { Pinecone } from "@pinecone-database/pinecone";
import * as functions from "firebase-functions";

const pineconeConfig = functions.config().pinecone;

if (!pineconeConfig) {
  console.error(
    "Pinecone config missing. Please set using Firebase Functions config."
  );
}

export const pineconeClient = new Pinecone({
  apiKey: pineconeConfig.apikey,
});
