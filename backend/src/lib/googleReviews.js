async function fetchGoogleReviews({
  accessToken,
  accountName,
  googleLocationId
}) {
  const reviews = [];
  let nextPageToken = null;

  do {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/${accountName}/${googleLocationId}/reviews`
    );
    url.searchParams.set("pageSize", "50");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        `Réponse Google non JSON (${response.status}) : ${raw.slice(0, 200)}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Erreur lecture avis Google (${response.status}) : ${JSON.stringify(data)}`
      );
    }

    reviews.push(...(data.reviews || []));
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  return reviews;
}

module.exports = fetchGoogleReviews;
