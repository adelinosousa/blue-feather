import type { Request } from "firebase-functions/v2/https";
import * as express from "express";

// TODO: Move this to functions config using `firebase functions:config:set api.key="your_secure_api_key"`
const staticToken = "";

export default function middleware(request: Request, response: express.Response, next: express.NextFunction) {
  if (!request.headers.authorization || !request.headers.authorization.startsWith("Bearer ")) {
    response.status(403).send({ error: "Unauthorized" });
    return;
  }

  const idToken = request.headers.authorization.split("Bearer ")[1];
  if (idToken !== staticToken) {
    response.status(403).send({ error: "Unauthorized" });
    return;
  }

  next();
}
