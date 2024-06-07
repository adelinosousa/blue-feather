import * as admin from "firebase-admin";

let initializeApp = (serviceAccount: string) => {
  initializeApp = () => {};
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });
};

export function firestore(serviceAccount: string) {
  try {
    initializeApp(serviceAccount);
  } catch (error) {
    console.error("Error initializing Firebase: ", error);
  }
  return admin.firestore();
}

export function messaging(serviceAccount: string) {
  try {
    initializeApp(serviceAccount);
  } catch (error) {
    console.error("Error initializing Firebase: ", error);
  }
  return admin.messaging();
}
