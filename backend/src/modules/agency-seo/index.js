const AgencySeoRepository =
  require("./repository");

const AgencySeoService =
  require("./service");

const createAgencySeoRoutes =
  require("./routes");

function createAgencySeoModule(prisma) {
  const repository =
    new AgencySeoRepository(prisma);

  const service =
    new AgencySeoService(repository);

  return {
    repository,
    service,
    routes:
      createAgencySeoRoutes(service)
  };
}

module.exports = createAgencySeoModule;
