"use strict";

module.exports = {
  ...require("./payment-experience"),
  ...require("./placement-executor"),
  ...require("./network-readiness"),
  routes: require("./routes"),
};
