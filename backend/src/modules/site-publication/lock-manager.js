"use strict";

const {
  sitePublicationError,
} =
  require(
    "./errors"
  );

class SitePublicationLockManager {
  constructor() {
    this.locks =
      new Map();
  }

  isLocked(
    siteId
  ) {
    return this.locks.has(
      String(siteId)
    );
  }

  current(
    siteId
  ) {
    return (
      this.locks.get(
        String(siteId)
      ) ||
      null
    );
  }

  acquire(
    siteId,
    operation
  ) {
    const key =
      String(siteId);

    const current =
      this.locks.get(
        key
      );

    if (current) {
      throw sitePublicationError(
        "SITE_PUBLICATION_ALREADY_RUNNING",
        "Une opération de publication est déjà en cours pour ce mini-site.",
        409,
        {
          siteId,
          current,
        }
      );
    }

    const lock = {
      siteId,

      operation,

      stage:
        "starting",

      startedAt:
        new Date()
          .toISOString(),

      updatedAt:
        new Date()
          .toISOString(),

      progress: {
        total:
          0,

        processed:
          0,

        skipped:
          0,

        failed:
          0,

        percentage:
          0,

        currentPage:
          null,
      },
    };

    this.locks.set(
      key,
      lock
    );

    return lock;
  }

  update(
    siteId,
    patch = {}
  ) {
    const key =
      String(siteId);

    const current =
      this.locks.get(
        key
      );

    if (!current) {
      return null;
    }

    const next = {
      ...current,

      ...patch,

      progress: {
        ...(
          current.progress ||
          {}
        ),

        ...(
          patch.progress ||
          {}
        ),
      },

      updatedAt:
        new Date()
          .toISOString(),
    };

    this.locks.set(
      key,
      next
    );

    return next;
  }

  release(
    siteId
  ) {
    this.locks.delete(
      String(siteId)
    );
  }
}

module.exports = {
  SitePublicationLockManager,
};
