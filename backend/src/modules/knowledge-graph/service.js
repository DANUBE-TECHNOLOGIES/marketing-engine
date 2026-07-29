const path = require("node:path");
const { NotFoundError } = require("../../core/errors");
const Repository = require("./repository");
const { importKnowledge } = require("./importer");

class KnowledgeGraphService {
  constructor(prisma) {
    this.prisma = prisma;
    this.repository = new Repository(prisma);
  }

  list(query) {
    return this.repository.list(query);
  }

  async get(slug, language) {
    const entity = await this.repository.getBySlug(slug, language);
    if (!entity) throw new NotFoundError("Entité knowledge introuvable.");
    return entity;
  }

  async graph(slug, language, depth) {
    const graph = await this.repository.graph(slug, language, depth);
    if (!graph) throw new NotFoundError("Entité knowledge introuvable.");
    return graph;
  }

  import({ directory, dryRun }) {
    return importKnowledge({
      prisma: this.prisma,
      directory: directory ? path.resolve(directory) : path.resolve(process.cwd(), "knowledge"),
      dryRun
    });
  }
}

module.exports = KnowledgeGraphService;
