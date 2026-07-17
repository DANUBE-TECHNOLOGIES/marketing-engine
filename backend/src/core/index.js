const prisma = require("./prisma/client");
const errors = require("./errors");
const slugify = require("./utils/slugify");

module.exports = {
  prisma,
  errors,
  slugify,
};
