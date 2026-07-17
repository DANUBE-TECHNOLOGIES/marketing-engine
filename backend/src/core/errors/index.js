const errors = require("./app-error");
const errorMiddleware = require("./error-middleware");

module.exports = {
  ...errors,
  errorMiddleware,
};
