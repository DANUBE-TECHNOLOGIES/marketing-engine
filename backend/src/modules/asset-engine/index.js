const createRepository = require("./repository");
const createService = require("./service");
const createController = require("./controller");
const createRoutes = require("./routes");

function routes({ prisma }) {
  const repository = createRepository(prisma);
  const service = createService(repository);
  const controller = createController(service);

  return createRoutes(controller);
}

module.exports = {
  routes
};
