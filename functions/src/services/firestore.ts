import * as admin from "firebase-admin";

export function firestore(serviceAccount: string) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } catch (error) {
    console.error("Error initializing Firebase: ", error);
  }
  return admin.firestore();
}