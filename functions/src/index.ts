// /**
//  * Import function triggers from their respective submodules:
//  *
//  * import {onCall} from "firebase-functions/v2/https";
//  * import {onDocumentWritten} from "firebase-functions/v2/firestore";
//  *
//  * See a full list of supported triggers at https://firebase.google.com/docs/functions
//  */

import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
// import * as logger from "firebase-functions/logger";

setGlobalOptions({
  maxInstances: 1,
  // minInstances: 1, // reduce cold starts, infers cost
  region: "europe-west1",
  memory: "128MiB",
});

// Secrets management
// https://firebase.google.com/docs/functions/config-env?gen=2nd#secret_parameters

export const blueFeather = onRequest({secrets: ["SUPER_SECRET"]}, (request, response) => {
  // logger.info("Hello logs!", {structuredData: true});
  response.send(`Hello from ${process.env.APP_NAME}! ${process.env.SUPER_SECRET}`);
});
