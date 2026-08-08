"use strict";

const fs =
  require(
    "node:fs/promises"
  );

const path =
  require(
    "node:path"
  );

const {
  sitePublicationError,
} =
  require(
    "./errors"
  );

function safeSegment(
  value
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  if (!normalized) {
    throw sitePublicationError(
      "INVALID_HISTORY_SEGMENT",
      "L’identifiant d’historique est invalide.",
      500
    );
  }

  return normalized;
}

class SitePublicationHistoryStore {
  constructor({
    storageDirectory,
  }) {
    this.storageDirectory =
      storageDirectory;
  }

  async ensureDirectory() {
    await fs.mkdir(
      this.storageDirectory,
      {
        recursive:
          true,
      }
    );
  }

  filePath(
    siteId
  ) {
    return path.join(
      this.storageDirectory,
      `${safeSegment(siteId)}.jsonl`
    );
  }

  async append(
    siteId,
    record
  ) {
    await this.ensureDirectory();

    const normalized = {
      id:
        record.id ||
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,

      siteId,

      ...record,
    };

    await fs.appendFile(
      this.filePath(
        siteId
      ),
      `${JSON.stringify(normalized)}\n`,
      "utf8"
    );

    return normalized;
  }

  async list(
    siteId,
    {
      limit = 50,
    } = {}
  ) {
    await this.ensureDirectory();

    let content = "";

    try {
      content =
        await fs.readFile(
          this.filePath(
            siteId
          ),
          "utf8"
        );
    } catch (error) {
      if (
        error.code ===
        "ENOENT"
      ) {
        return [];
      }

      throw error;
    }

    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map(
        (line) => {
          try {
            return JSON.parse(
              line
            );
          } catch {
            return null;
          }
        }
      )
      .filter(Boolean)
      .reverse()
      .slice(
        0,
        Math.max(
          1,
          Math.min(
            Number(limit) || 50,
            200
          )
        )
      );
  }

  async latest(
    siteId
  ) {
    const items =
      await this.list(
        siteId,
        {
          limit:
            1,
        }
      );

    return (
      items[0] ||
      null
    );
  }
}

module.exports = {
  SitePublicationHistoryStore,
  safeSegment,
};
