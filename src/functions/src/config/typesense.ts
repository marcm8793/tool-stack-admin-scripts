import Typesense from "typesense";
import * as functions from "firebase-functions";

console.log("Full Firebase config:", functions.config());
console.log("Typesense config:", functions.config().typesense);

const typesenseConfig = functions.config().typesense;

if (!typesenseConfig) {
  console.error(
    "Typesense configuration is missing. Please set it using Firebase " +
      "Functions config."
  );
}

export const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: typesenseConfig.host,
      port: parseInt(typesenseConfig.port),
      protocol: typesenseConfig.protocol,
    },
  ],
  apiKey: typesenseConfig.apikey,
  connectionTimeoutSeconds: 2,
});
