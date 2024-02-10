// /**
//  * Import function triggers from their respective submodules:
//  *
//  * import {onCall} from "firebase-functions/v2/https";
//  * import {onDocumentWritten} from "firebase-functions/v2/firestore";
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

import { messaging } from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";
import { firestore } from "./services/firestore";

setGlobalOptions({
  maxInstances: 1,
  // minInstances: 1, // reduce cold starts, infers cost
  region: "europe-west1",
  memory: "128MiB",
});

// Secrets management
// https://firebase.google.com/docs/functions/config-env?gen=2nd#secret_parameters

exports.health = onRequest({ secrets: ["SUPER_SECRET"] }, (request, response) => {
  // logger.info("Hello logs!", {structuredData: true});
  response.status(200).send(`Hello from ${process.env.APP_NAME}! ${process.env.SUPER_SECRET}`);
});

// Register a device
exports.register = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  const { deviceToken } = request.body;
  if (!deviceToken) {
    response.status(400).send({ error: "Device token is required" });
    return;
  }

  try {
    const devicesRef = firestore(process.env.BF_SERVICE_ACCOUNT!).collection('devices');

    // Check if the device token already exists
    const snapshot = await devicesRef.where('token', '==', deviceToken).limit(1).get();
    if (!snapshot.empty) {
      response.status(200).send({ message: 'Device already registered' });
      return;
    }

    const docRef = await devicesRef.add({ token: deviceToken });
    response.status(200).send({ message: `Device registered with ID: ${docRef.id}` });
  } catch (error) {
    console.error("Error registering device: ", error);
    response.status(500).send({ error: "Failed to register device" });
  }
});

// Unregister a device
exports.unregister = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  const { deviceToken } = request.body;
  if (!deviceToken) {
    response.status(400).send({ error: "Device token is required" });
    return;
  }

  try {
    const devicesRef = firestore(process.env.BF_SERVICE_ACCOUNT!).collection('devices');
    const snapshot = await devicesRef.where('token', '==', deviceToken).get();
    if (snapshot.empty) {
      response.status(404).send({ message: 'Device not found' });
      return;
    }

    snapshot.forEach(doc => doc.ref.delete());
    response.status(200).send({ message: 'Device unregistered successfully' });
  } catch (error) {
    console.error("Error unregistering device: ", error);
    response.status(500).send({ error: "Failed to unregister device" });
  }
});

// Send a notification
exports.notify = onRequest(async (request, response) => {
  const { title, body, tokens } = request.body; // Assume tokens is an array of device tokens
  try {
    const message = {
      notification: { title, body },
      tokens: tokens,
    };

    const result = await messaging().sendEachForMulticast(message);
    response.status(200).send({ successCount: result.successCount, failureCount: result.failureCount });
  } catch (error) {
    console.error("Error sending notification: ", error);
    response.status(500).send({ error: "Failed to send notification" });
  }
});
