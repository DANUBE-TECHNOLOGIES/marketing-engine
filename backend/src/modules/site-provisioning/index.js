"use strict";
module.exports = {
  routes: require("./routes"),
  SiteProvisioningService: require("./service").SiteProvisioningService,
  SiteProvisioningRepository: require("./repository"),
  templates: require("./templates"),
};
