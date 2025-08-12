import { Client, Databases } from "node-appwrite"; // Import necessary classes from the Appwrite SDK
import crypto from "crypto"; // Node.js module for cryptographic functions

// The main function to be executed by Appwrite when the function is triggered
export default async ({ req, res, log, error }) => {
  // Initialize the Appwrite client with necessary credentials
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT) // Set the Appwrite API endpoint
    .setProject(process.env.APPWRITE_PROJECT_ID) // Set the Appwrite project ID
    .setKey(process.env.functionAccessKey); // Set the API key with access to the database

  // Initialize the Databases service using the authenticated client
  const databases = new Databases(client);

  // Retrieve environment variables for database and collection IDs
  const databaseId = process.env.DatabaseID; // ID of the Appwrite database
  const nutritionFactsCollectionID = process.env.nutritionFactsCollectionID; // ID of the collection containing nutrition facts

  try {
    // Fetch up to 100 documents from the nutrition facts collection
    // No filters applied, just retrieving all documents available up to the limit
    const response = await databases.listDocuments(
      databaseId,
      nutritionFactsCollectionID,
      [], // No filters
      100 // Maximum number of documents to retrieve
    );

    // Extract the 'fact' field from each document and filter out any undefined or null values
    const facts = response.documents.map(doc => doc.fact).filter(Boolean);

    // If no facts were retrieved, throw an error to be caught below
    if (facts.length === 0) throw new Error("No facts found");

    // Generate a consistent hash based on today's date to select a fact
    // This ensures the same fact is shown for the same day
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
    const hash = crypto.createHash("sha256").update(today).digest("hex"); // Generate SHA-256 hash of the date string

    // Convert part of the hash to a number and use modulo to get a valid index within the facts array
    const index = parseInt(hash.slice(0, 8), 16) % facts.length; // Deterministic and consistent index

    log(facts[index])
    // Return the selected fact and today's date in JSON response
    return res.json({
      date: today, // The current date
      fact: facts[index] // The selected fact for today
    });

  } catch (err) {
    // If any error occurs, log the error and return an error message in the response
    log("❌ Error fetching daily fact:", err);
    return res.json({
      error: "Could not retrieve daily fact.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined // Only include error details in development
    });
  }
};
