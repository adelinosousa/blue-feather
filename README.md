# Blue Feather

Serverless Notification API

## Dependencies

[Firebase CLI](https://www.npmjs.com/package/firebase-tools). You'll need to login using:

```bash
$ firebase login
```

## Configuration

### Secrets management
firebase functions:secrets:set BF_SERVICE_ACCOUNT

## Local setup

### Installation

```bash
$ npm i
```

### Run

```bash
$ npm run serve
```

## Deployment

```bash
$ npm run deploy
```

## New funcion

To create a new function use:

```bash
$ firebase init {name}
```
