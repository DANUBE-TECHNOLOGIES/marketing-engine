import MainLayout from "../components/MainLayout";

async function getPosts() {
  try {
    const res = await fetch("http://backend:4000/google-posts/network-dashboard", {
      cache: "no-store"
    });
    return await res.json();
  } catch {
    return { rows: [] };
  }
}

async function getReviews() {
  try {
    const res = await fetch("http://backend:4000/review-network", {
      cache: "no-store"
    });
    return await res.json();
  } catch {
    return { rows: [] };
  }
}

async function getCitations() {
  try {
    const res = await fetch("http://backend:4000/directories/dashboard", {
      cache: "no-store"
    });
    return await res.json();
  } catch {
    return { rows: [] };
  }
}

function computeScore(posts, reviews, citations) {

  const postScore = Math.min(
    100,
    (posts?.published || 0) * 20
  );

  const reviewScore = Math.min(
    100,
    (reviews?.reviews30 || 0) * 33
  );

  const citationScore =
    citations?.score || 0;

  const total =
    Math.round(
      (postScore * 0.35) +
      (reviewScore * 0.35) +
      (citationScore * 0.30)
    );

  return {
    total,
    postScore,
    reviewScore,
    citationScore
  };
}

export default async function Page() {

  const postsData = await getPosts();
  const reviewsData = await getReviews();
  const citationsData = await getCitations();

  const agencies = {};

  (postsData.rows || []).forEach((row) => {
    agencies[row.city] = {
      ...(agencies[row.city] || {}),
      posts: row
    };
  });

  (reviewsData.rows || []).forEach((row) => {
    agencies[row.city] = {
      ...(agencies[row.city] || {}),
      reviews: row
    };
  });

  (citationsData.rows || []).forEach((row) => {
    agencies[row.city] = {
      ...(agencies[row.city] || {}),
      citations: row
    };
  });

  const rows =
    Object.entries(agencies)
      .map(([city, data]) => {

        const score =
          computeScore(
            data.posts,
            data.reviews,
            data.citations
          );

        let priority = "OK";

        if (score.total < 40)
          priority = "HIGH";
        else if (score.total < 70)
          priority = "MEDIUM";

        return {
          city,
          agencyName:
            data.citations?.agencyName ||
            data.reviews?.agencyName ||
            city,

          priority,

          ...score,

          reviews30:
            data.reviews?.reviews30 || 0,

          citations:
            data.citations?.validated || 0
        };
      })
      .sort((a,b)=>b.total-a.total);

  const networkScore =
    rows.length
      ? Math.round(
          rows.reduce(
            (s,r)=>s+r.total,
            0
          ) / rows.length
        )
      : 0;

  return (
    <MainLayout
      title="SEO Dashboard"
      subtitle="Pilotage SEO réseau Mondescale"
    >

      <div className="grid grid-cols-4 gap-4 mb-8">

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">
            Score réseau
          </div>
          <div className="text-4xl font-bold">
            {networkScore}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">
            Priorité haute
          </div>
          <div className="text-4xl font-bold">
            {rows.filter(
              r=>r.priority==="HIGH"
            ).length}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">
            Priorité moyenne
          </div>
          <div className="text-4xl font-bold">
            {rows.filter(
              r=>r.priority==="MEDIUM"
            ).length}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">
            Agences suivies
          </div>
          <div className="text-4xl font-bold">
            {rows.length}
          </div>
        </div>

      </div>

      <div className="bg-white rounded-2xl shadow p-6">

        <h2 className="text-xl font-bold mb-6">
          Classement SEO Réseau
        </h2>

        <table className="w-full text-sm">

          <thead>
            <tr className="border-b">
              <th className="text-left py-3">
                Agence
              </th>

              <th>SEO</th>

              <th>Posts</th>

              <th>Avis</th>

              <th>Citations</th>

              <th>Priorité</th>
            </tr>
          </thead>

          <tbody>

            {rows.map((row)=>(
              <tr
                key={row.city}
                className="border-b"
              >
                <td className="py-3">
                  <div className="font-semibold">
                    {row.agencyName}
                  </div>

                  <div className="text-xs text-gray-500">
                    {row.city}
                  </div>
                </td>

                <td>
                  <strong>
                    {row.total}
                  </strong>
                </td>

                <td>
                  {row.postScore}
                </td>

                <td>
                  {row.reviewScore}
                </td>

                <td>
                  {row.citationScore}
                </td>

                <td>
                  {row.priority}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </MainLayout>
  );
}
