"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  publishedLike,
} =
  require(
    "../src/modules/public-site-read/service"
  );

test(
  "publishedLike reconnaît uniquement les états publiés",
  () => {
    assert.equal(
      publishedLike({
        status:
          "published",
      }),
      true
    );

    assert.equal(
      publishedLike({
        published:
          true,
      }),
      true
    );

    assert.equal(
      publishedLike({
        status:
          "draft",
      }),
      false
    );

    assert.equal(
      publishedLike({
        status:
          "review",
      }),
      false
    );
  }
);
