<div align="center"><img src="https://github.com/adelinosousa/blue-feather/blob/main/common/images/BlueFeatherIcon.png?raw=true" alt="Blue Feather"/></div>

# Blue Feather 

This project is an example implementation of a web API for managing device registrations using Firebase Cloud Messaging (FCM). It supports registering and unregistering devices, as well as subscribing and unsubscribing them from topics for targeted notifications.

## Features

- Device registration and unregistration with FCM.
- Subscription management for FCM topics.

## Getting Started

### Prerequisites

- Node.js and npm installed.
- [Firebase CLI](https://www.npmjs.com/package/firebase-tools) and Firebase Admin SDK set up.
- Firebase account.

### Installation

Clone the repository:

```bash
git clone https://github.com/adelinosousa/blue-feather.git
```

Switch to API directory:

```bash
cd functions
```

Install dependencies:

```bash
npm install
```

Login to firebase:
```bash
$ firebase login
```

Start the server:

```bash
npm run serve
```

### Configuration

Ensure you have setup Firebase service account and set the `BF_SERVICE_ACCOUNT` secret with your Firebase service account file content.
You can set the `BF_SERVICE_ACCOUNT` secret using:

```bash
firebase functions:secrets:set BF_SERVICE_ACCOUNT
```

### Usage

The API supports the following endpoints:

    POST /register: Register a device token.
        Body: { "deviceToken": "<device_token>", "data": "<device_data>" }

    POST /unregister: Unregister a device token.
        Body: { "deviceToken": "<device_token>" }

    POST /notify: Send notification to devices.
        Body: { "title": "<notification_title>", "body": "<notification_body>", "tokens": [<device_token>] }

    POST /subscribe: Subscribe a device to a topic.
        Body: { "deviceToken": "<device_token>", "topic": "<topic_name>" }

    POST /unsubscribe: Unsubscribe a device from a topic.
        Body: { "deviceToken": "<device_token>", "topic": "<topic_name>" }

    POST /send: Send notification to devices in the given topic.
        Body: { "title": "<notification_title>", "body": "<notification_body>", "topic": "<topic_name>" }

### Examples

Register a device:

```bash
curl -X POST http://localhost:5001/blue-feather-e2afc/europe-west1/register \
-H "Content-Type: application/json" \
-d '{"deviceToken": "your_device_token_here"}'
```

Register a device (with data):

```bash
curl -X POST http://localhost:5001/blue-feather-e2afc/europe-west1/register \
-H "Content-Type: application/json" \
-d '{"deviceToken": "your_device_token_here", "data": {"userId": "12345"}}'
```

Notify a device (with data):
```bash
curl -X POST http://localhost:5001/blue-feather-e2afc/europe-west1/notify \
-H "Content-Type: application/json" \
-d '{"title": "notification title", "body": "notification body", "key": "userId", "value": "12345"}'
```

Subscribe a device to a topic:

```bash
curl -X POST http://localhost:5001/blue-feather-e2afc/europe-west1/subscribe\
-H "Content-Type: application/json" \
-d '{"deviceToken": "your_device_token_here", "topic": "news"}'
```

Or use the [example flutter app](https://github.com/adelinosousa/blue-feather/tree/main/app) provided.

## Deployment

Deploy API using:

```bash
$ npm run deploy
```

## Security

This example includes a basic API key authentication out of the box (middleware.ts). It's recommended to implement API key checks, HTTPS, and other security measures suitable for your deployment environment.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for further discussion.
