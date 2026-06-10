const assert = require("node:assert/strict");
const test = require("node:test");
const fetchGoogleReviews = require("../src/lib/googleReviews");

test("récupère toutes les pages d'avis Google", async () => {
  const originalFetch = global.fetch;
  const calls = [];

  global.fetch = async (url) => {
    calls.push(String(url));
    const pageToken = new URL(url).searchParams.get("pageToken");

    if (!pageToken) {
      return new Response(JSON.stringify({
        reviews: [{ reviewId: "one" }],
        nextPageToken: "page-two"
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      reviews: [{ reviewId: "two" }]
    }), { status: 200 });
  };

  try {
    const reviews = await fetchGoogleReviews({
      accessToken: "token",
      accountName: "accounts/1",
      googleLocationId: "locations/2"
    });

    assert.deepEqual(reviews.map((review) => review.reviewId), ["one", "two"]);
    assert.equal(calls.length, 2);
    assert.match(calls[1], /pageToken=page-two/);
  } finally {
    global.fetch = originalFetch;
  }
});
