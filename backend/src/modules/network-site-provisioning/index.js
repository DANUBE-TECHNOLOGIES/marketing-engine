"use strict";

const {
  routes,
} = require("./routes");

const {
  NetworkSiteProvisioningService,
} = require("./service");

module.exports = {
  routes,

  NetworkSiteProvisioningService,

  health({
    prisma,
  } = {}) {
    return new NetworkSiteProvisioningService({
      prisma,
    }).health();
  },
};
