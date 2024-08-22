const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK (make sure you have the necessary credentials)
admin.initializeApp();

async function setAdminRole(uid: string) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log("Admin role set successfully");
  } catch (error) {
    console.error("Error setting admin role:", error);
  }
}

// Call this function with the user's UID to set them as an admin
// setAdminRole('user-uid-here');
