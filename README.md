## Install
```sh
npm install --save error.flynn
```

---

## Use
First, setup an Incoming Webhook in Slack `https://<your team>.slack.com/services/`

Then:

```js
const express = require('express'),
  flynn = require('error.flynn');

const app = express();
app.get('/', (req, res, next) => {
  next(new Error('Send me to Slack!'));
});
// Either set process.env.ERROR_FLYNN_URL or use the url as the first param for flynn)
app.use(flynn('https://hooks.slack.com/services/TOKEN'));
app.use((err, req, res, next) {
  res.sendStatus(500);
});
```

---

## Tests
```sh
npm test
```
