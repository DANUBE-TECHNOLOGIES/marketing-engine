"use strict";
const routes = require("./routes");
const AiContentRepository = require("./repository");
const { AiContentService } = require("./service");
const providers = require("./providers");
module.exports = { routes, AiContentRepository, AiContentService, providers };
