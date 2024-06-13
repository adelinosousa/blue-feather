// /**
//  * Import function triggers from their respective submodules:
//  *
//  * import {onCall} from "firebase-functions/v2/https";
//  * import {onDocumentWritten} from "firebase-functions/v2/firestore";
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";
import { firestore, messaging } from "./services/firestore";
import middleware from "./middleware";

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
  middleware(request, response, () => {
    response.status(200).send(`Hello from ${process.env.APP_NAME}! ${process.env.SUPER_SECRET}`);
  });
});

// Register a device
exports.register = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  middleware(request, response, async () => {
    const { deviceToken, data } = request.body;

    // Check if the device token is provided
    if (!deviceToken) {
      response.status(400).send({ error: "Device token is required" });
      return;
    }

    try {
      const devicesRef = firestore(process.env.BF_SERVICE_ACCOUNT!).collection("devices");

      // Check if the device token already exists
      const snapshot = await devicesRef.where("token", "==", deviceToken).limit(1).get();
      if (!snapshot.empty) {
        response.status(200).send({ message: "Device already registered" });
        return;
      }

      // Prepare the registration data
      let newRegistration = { token: deviceToken };
      if (data) {
        // Prefix the data keys with "data.". This is to avoid conflicts and data exploitation
        const prefixedData = Object.keys(data).reduce((acc, key) => {
          acc["data." + key] = data[key];
          return acc;
        }, {} as any);

        newRegistration = { ...newRegistration, ...prefixedData };
      }

      // Register the device token
      const docRef = await devicesRef.add(newRegistration);
      response.status(200).send({ message: `Device registered with ID: ${docRef.id}` });
    } catch (error) {
      console.error("Error registering device: ", error);
      response.status(500).send({ error: "Failed to register device" });
    }
  });
});

// Unregister a device
exports.unregister = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  middleware(request, response, async () => {
    const { deviceToken } = request.body;

    // Check if the device token is provided
    if (!deviceToken) {
      response.status(400).send({ error: "Device token is required" });
      return;
    }

    try {
      // Check if the device token exists
      const devicesRef = firestore(process.env.BF_SERVICE_ACCOUNT!).collection("devices");
      const devicesSnapshot = await devicesRef.where("token", "==", deviceToken).get();
      if (devicesSnapshot.empty) {
        response.status(404).send({ message: "Device not found" });
        return;
      }

      // Delete the device token
      devicesSnapshot.forEach((doc) => doc.ref.delete());

      // Delete the subscriptions
      const topicsSnapshot = await firestore(process.env.BF_SERVICE_ACCOUNT!).collection("topics")
        .where("token", "==", deviceToken).get();

      if (!topicsSnapshot.empty) {
        for (const doc of topicsSnapshot.docs) {
          const topic = doc.data().topic;
          await messaging(process.env.BF_SERVICE_ACCOUNT!).unsubscribeFromTopic(deviceToken, topic);
          doc.ref.delete();
        }
      }

      response.status(200).send({ message: "Device unregistered successfully" });
    } catch (error) {
      console.error("Error unregistering device: ", error);
      response.status(500).send({ error: "Failed to unregister device" });
    }
  });
});

// Send a notification
exports.notify = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  middleware(request, response, async () => {
    const { title, body, tokens, key, value } = request.body; // Tokens is an array of strings
    try {
      let snapshot;

      if (tokens && tokens.length > 0) {
        // Check if the device tokens are registered
        snapshot = await firestore(process.env.BF_SERVICE_ACCOUNT!)
          .collection("devices")
          .where("token", "in", tokens)
          .get();
        if (snapshot.empty) {
          response.status(404).send({ error: "No registered devices found" });
          return;
        }
      }

      if (key && value) {
        // Check if the devices with the provided key-value pair are registered
        snapshot = await firestore(process.env.BF_SERVICE_ACCOUNT!)
          .collection("devices")
          .where("data." + key, "==", value)
          .get();
          if (snapshot.empty) {
            response.status(404).send({ error: "No registered devices found" });
            return;
          }
      }

      if (!snapshot) {
        response.status(200).send({ error: "Invalid request. Provide either tokens or key/value to notify" });
        return;
      }

      console.log(`Found ${snapshot.size} registered devices`);
      const registeredTokens = snapshot.docs.map<string>((doc) => doc.data().token);

      // Send the notification to the registered devices
      const message = {
        notification: { title, body },
        tokens: registeredTokens,
      };

      const result = await messaging(process.env.BF_SERVICE_ACCOUNT!).sendEachForMulticast(message);
      const errors = result.responses.filter((response) => !response.success)
        .map((response, index) => `Failed to send notification to ${tokens[index]}: ${response.error}`);

      response.status(200)
        .send({ successCount: result.successCount, failureCount: result.failureCount, errors: errors });
    } catch (error) {
      console.error("Error sending notification: ", error);
      response.status(500).send({ error: "Failed to send notification" });
    }
  });
});

// Notes
// 1. Topic messaging supports unlimited subscriptions for each topic.
// 2. One app instance can be subscribed to no more than 2000 topics
// 3. A server integration can send a single message to multiple topics at once. This, however, is limited to 5 topics.

// Subscribe to a topic
exports.subscribe = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  middleware(request, response, async () => {
    const { topic, deviceToken } = request.body;
    try {
      // Check if the device token is registered
      const snapshot = await firestore(process.env.BF_SERVICE_ACCOUNT!)
        .collection("devices")
        .where("token", "==", deviceToken).limit(1)
        .get();
      if (snapshot.empty) {
        response.status(404).send({ error: "Device not found" });
        return;
      }

      // Check if the device is already subscribed to the topic
      const topicsCollection = firestore(process.env.BF_SERVICE_ACCOUNT!).collection("topics");
      const topicsSnapshot = await topicsCollection.where("token", "==", deviceToken).where("topic", "==", topic).get();
      if (!topicsSnapshot.empty) {
        response.status(200).send({ message: `Device already subscribed to topic ${topic}` });
        return;
      }

      // Subscribe to the topic on behalf of the device
      const result = await messaging(process.env.BF_SERVICE_ACCOUNT!).subscribeToTopic(deviceToken, topic);
      if (result.failureCount > 0) {
        const errors = result.errors.map((error) => `Failed to subscribe to topic ${topic}: ${error}`);
        response.status(200).send({ error: errors });
        return;
      }

      // Save the subscription in the firestore
      const docRef = await firestore(process.env.BF_SERVICE_ACCOUNT!)
        .collection("topics")
        .add({ topic: topic, token: deviceToken });
      response.status(200).send({ message: `Subscribed to topic ${topic} successfully with ID: ${docRef.id}` });
    } catch (error) {
      console.error("Error subscribing to topic: ", error);
      response.status(500).send({ error: "Failed to subscribe to topic" });
    }
  });
});

// Unsubscribe from a topic
exports.unsubscribe = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  middleware(request, response, async () => {
    const { topic, deviceToken } = request.body;
    try {
      const result = await messaging(process.env.BF_SERVICE_ACCOUNT!).unsubscribeFromTopic(deviceToken, topic);

      if (result.failureCount > 0) {
        const errors = result.errors.map((error) => `Failed to unsubscribe from topic ${topic}: ${error}`);
        response.status(200).send({ error: errors });
        return;
      }

      // Remove the subscription from the firestore
      const snapshot = await firestore(process.env.BF_SERVICE_ACCOUNT!).collection("topics")
        .where("token", "==", deviceToken)
        .where("topic", "==", topic).get();

      if (!snapshot.empty) {
        snapshot.forEach((doc) => doc.ref.delete());
      }

      response.status(200).send({ message: `Unsubscribed from topic ${topic} successfully` });
    } catch (error) {
      console.error("Error unsubscribing from topic: ", error);
      response.status(500).send({ error: "Failed to unsubscribe from topic" });
    }
  });
});

// Send a message to a topic
exports.send = onRequest({ secrets: ["BF_SERVICE_ACCOUNT"] }, async (request, response) => {
  middleware(request, response, async () => {
    const { title, body, topic } = request.body;
    try {
      // Check if the topic exists in the firestore
      const snapshot = await firestore(process.env.BF_SERVICE_ACCOUNT!)
        .collection("topics")
        .where("topic", "==", topic)
        .get();
      if (snapshot.empty) {
        response.status(404).send({ error: "Topic not found" });
        return;
      }

      const message = {
        notification: { title, body },
        topic,
      };

      await messaging(process.env.BF_SERVICE_ACCOUNT!).send(message);

      response.status(200).send({ message: `Message sent to topic ${topic} successfully` });
    } catch (error) {
      console.error("Error sending message to topic: ", error);
      response.status(500).send({ error: "Failed to send message to topic" });
    }
  });
});
