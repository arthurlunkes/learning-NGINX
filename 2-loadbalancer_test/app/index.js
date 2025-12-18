const express = require("express");
const os = require("os");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello World! OS: " + os.hostname());
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});
