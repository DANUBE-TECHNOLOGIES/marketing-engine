const express = require("express");

function pick(arr, index) {
  return arr[index % arr.length];
}

function generateUniquePostForAgency(agency, seed = 0) {
  const city = agency.city || "votre ville";
  const name = agency.name || "votre agence de voyages";

  const angles = [
    {
      title: `Préparer ses vacances avec une agence de voyages à ${city}`,
      intro: `Vous avez un projet de vacances, de circuit, de croisière ou de séjour tout compris ?`,
      value: `Votre agence ${name} vous accompagne avec des conseils personnalisés, un suivi humain et une vraie expertise destination.`,
      close: `Pour vos prochains voyages au départ de ${city}, échangez avec une conseillère voyage et construisez un projet adapté à vos envies.`
    },
    {
      title: `Pourquoi passer par votre agence de voyages à ${city} ?`,
      intro: `Organiser un voyage ne se limite pas à comparer un prix sur internet.`,
      value: `Avec ${name}, vous bénéficiez d’un accompagnement avant, pendant et après le départ, ainsi que de conseils professionnels pour sécuriser votre séjour.`,
      close: `Séjour en famille, voyage sur mesure, croisière ou circuit : votre agence locale reste à votre écoute.`
    },
    {
      title: `Un projet de voyage ? Votre agence à ${city} vous conseille`,
      intro: `Envie de partir prochainement mais besoin d’être conseillé sur la destination, le budget ou les formalités ?`,
      value: `${name} vous aide à choisir la solution la plus adaptée : séjour balnéaire, club vacances, circuit organisé, croisière ou voyage personnalisé.`,
      close: `Prenez contact avec votre agence de voyages à ${city} pour préparer sereinement votre prochain départ.`
    },
    {
      title: `Des conseils voyage personnalisés à ${city}`,
      intro: `Chaque voyageur est différent : budget, rythme, destination, envies, contraintes familiales ou formalités.`,
      value: `Votre agence ${name} prend le temps d’étudier votre projet pour vous proposer une solution claire, sécurisée et adaptée.`,
      close: `Pour un voyage bien préparé, profitez de l’accompagnement d’une agence locale proche de vous.`
    }
  ];

  const extras = [
    `Nos équipes peuvent vous accompagner sur les séjours, circuits, croisières, billets d’avion et voyages sur mesure.`,
    `Vous profitez d’un interlocuteur local, d’un suivi professionnel et d’une assistance en cas d’imprévu.`,
    `Le prix est généralement identique à celui proposé en ligne, avec en plus le conseil et l’accompagnement humain.`,
    `Votre agence vous aide à comparer les offres, comprendre les conditions et réserver avec plus de sérénité.`
  ];

  const angle = pick(angles, seed);
  const extra = pick(extras, seed + 1);

  return {
    title: angle.title,
    content: `${angle.intro}

${angle.value}

${extra}

${angle.close}`,
    ctaLabel: "Demander un devis",
    ctaUrl: agency.website || null
  };
}

async function refreshGoogleAccessToken(prisma, token) {
  if (!token.refreshToken) {
    throw new Error("Refresh token Google absent. Reconnecte Google avec access_type=offline et prompt=consent.");
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: token.refreshToken,
    grant_type: "refresh_token"
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Erreur refresh token Google : ${JSON.stringify(data)}`);
  }

  const expiryDate = Date.now() + Number(data.expires_in || 3600) * 1000;

  const updated = await prisma.googleToken.update({
    where: { id: token.id },
    data: {
      accessToken: data.access_token,
      expiryDate: BigInt(expiryDate)
    }
  });

  return updated.accessToken;
}

async function getGoogleAccessToken(prisma) {
  const token = await prisma.googleToken.findFirst({
    orderBy: { createdAt: "desc" }
  });

  if (!token || !token.accessToken) {
    throw new Error("Aucun token Google disponible.");
  }

  const expiry = token.expiryDate ? Number(token.expiryDate) : 0;

  if (expiry < Date.now() + 2 * 60 * 1000) {
    return await refreshGoogleAccessToken(prisma, token);
  }

  return token.accessToken;
}

function buildLocalPostPayload(post) {
  const payload = {
    languageCode: "fr",
    summary: post.content,
    topicType: "STANDARD"
  };

  if (post.ctaLabel && post.ctaUrl) {
    payload.callToAction = {
      actionType: "LEARN_MORE",
      url: post.ctaUrl
    };
  }

  return payload;
}

module.exports = function createGooglePostsRoutes(prisma) {
  const router = express.Router();

  router.get("/google-posts", async (req, res) => {
    const posts = await prisma.googlePost.findMany({
      include: { agency: true },
      orderBy: [
        { status: "asc" },
        { plannedAt: "asc" },
        { createdAt: "desc" }
      ]
    });

    res.json({
      total: posts.length,
      draft: posts.filter((p) => p.status === "draft").length,
      planned: posts.filter((p) => p.status === "planned").length,
      approved: posts.filter((p) => p.status === "approved").length,
        queued: posts.filter((p) => p.status === "queued").length,
        published: posts.filter((p) => p.status === "published").length,
      error: posts.filter((p) => p.status === "error").length,
      posts
    });
  });

  router.post("/google-posts/generate-from-actions", async (req, res) => {
    const actions = await prisma.networkAction.findMany({
      where: {
        status: { in: ["todo", "in_progress"] },
        OR: [
          { lever: "google-posts" },
          { lever: "seo-alert" },
          { lever: "rankings" }
        ]
      },
      include: { agency: true },
      take: 50
    });

    let created = 0;
    let existing = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const agency = action.agency;

      if (!agency) continue;

      const already = await prisma.googlePost.findFirst({
        where: {
          agencyId: agency.id,
          status: { in: ["draft", "planned"] }
        }
      });

      if (already) {
        existing++;
        continue;
      }

      const generated = generateUniquePostForAgency(agency, i);

      await prisma.googlePost.create({
        data: {
          agencyId: agency.id,
          title: generated.title,
          content: generated.content,
          ctaLabel: generated.ctaLabel,
          ctaUrl: generated.ctaUrl,
          status: "draft",
          plannedAt: new Date(Date.now() + (3 + i) * 24 * 60 * 60 * 1000)
        }
      });

      created++;
    }

    res.json({
      sourceActions: actions.length,
      created,
      existing
    });
  });

  router.post("/google-posts/:id/regenerate", async (req, res) => {
    const id = Number(req.params.id);

    const post = await prisma.googlePost.findUnique({
      where: { id },
      include: { agency: true }
    });

    if (!post) {
      return res.status(404).json({ error: "Post introuvable" });
    }

    if (post.googlePostName) {
      return res.status(400).json({ error: "Impossible de régénérer un post déjà publié." });
    }

    const seed = Date.now() % 1000;
    const generated = generateUniquePostForAgency(post.agency, seed);

    const updated = await prisma.googlePost.update({
      where: { id },
      data: {
        title: generated.title,
        content: generated.content,
        ctaLabel: generated.ctaLabel,
        ctaUrl: generated.ctaUrl,
        status: "draft",
        lastPublishError: null
      },
      include: { agency: true }
    });

    res.json(updated);
  });

  router.patch("/google-posts/:id", async (req, res) => {
    const id = Number(req.params.id);
    const data = {};

    ["title", "content", "ctaLabel", "ctaUrl", "status"].forEach((key) => {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    });

    if (req.body.plannedAt !== undefined) {
      data.plannedAt = req.body.plannedAt ? new Date(req.body.plannedAt) : null;
    }

    if (req.body.status === "published") {
      data.publishedAt = new Date();
    }

    const post = await prisma.googlePost.update({
      where: { id },
      data,
      include: { agency: true }
    });

    res.json(post);
  });

  router.post("/google-posts/:id/publish-google", async (req, res) => {
    const id = Number(req.params.id);

    try {
      const post = await prisma.googlePost.findUnique({
        where: { id },
        include: { agency: true }
      });

      if (!post) return res.status(404).json({ error: "Post introuvable" });

      if (post.googlePostName) {
        return res.json({
          ok: true,
          alreadyPublished: true,
          message: "Post déjà publié sur Google",
          post
        });
      }

      if (!post.agency?.googleLocationId) {
        throw new Error("googleLocationId manquant pour cette agence.");
      }

      const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;

      if (!accountId) {
        throw new Error("GOOGLE_BUSINESS_ACCOUNT_ID manquant.");
      }

      let parent = post.agency.googleLocationId;

      if (parent.startsWith("locations/")) {
        parent = `accounts/${accountId}/${parent}`;
      }

      const accessToken = await getGoogleAccessToken(prisma);

      const googleRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${parent}/localPosts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildLocalPostPayload(post))
        }
      );

      const text = await googleRes.text();

      let googleData = {};
      try {
        googleData = JSON.parse(text);
      } catch {
        googleData = { raw: text };
      }

      if (!googleRes.ok) {
        await prisma.googlePost.update({
          where: { id },
          data: {
            status: "error",
            lastPublishError: JSON.stringify(googleData).slice(0, 2000)
          }
        });

        return res.status(googleRes.status).json({
          error: "Erreur publication Google",
          google: googleData
        });
      }

      const updated = await prisma.googlePost.update({
        where: { id },
        data: {
          status: "published",
          publishedAt: new Date(),
          googlePostName: googleData.name || null,
          publishedUrl: googleData.searchUrl || null,
          lastPublishError: null
        },
        include: { agency: true }
      });

      await prisma.networkAction.updateMany({
        where:{
          agencyId:post.agencyId,
          status:{
            in:["todo","in_progress"]
          },
          OR:[
            {lever:"seo-alert"},
            {lever:"google-posts"},
            {lever:"rankings"}
          ]
        },
        data:{
          status:"done",
          comment:"Fermeture automatique après publication Google Post"
        }
      });

      res.json({
        ok: true,
        post: updated,
        google: googleData
      });
    } catch (error) {
      await prisma.googlePost.update({
        where: { id },
        data: {
          status: "error",
          lastPublishError: error.message
        }
      }).catch(() => {});

      res.status(500).json({ error: error.message });
    }
  });

  
router.post("/google-posts/bulk-approve", async (req,res)=>{

try{

const ids =
req.body.ids || [];

const result =
await prisma.googlePost.updateMany({

where:{
id:{
in:ids
},
status:{
in:[
"draft",
"planned"
]
}
},

data:{
status:"approved"
}

});

res.json(result);

}catch(e){

res.status(500).json({
error:e.message
});

}

});


router.post("/google-posts/bulk-publish", async (req,res)=>{

try{

const ids =
req.body.ids || [];

const posts =
await prisma.googlePost.findMany({

where:{
id:{
in:ids
}
}

});

const result=[];

for(const post of posts){

try{

const r =
await fetch(
`http://localhost:${process.env.PORT || 4000}/google-posts/${post.id}/publish-google`,
{
method:"POST"
}
);

const data =
await r.json();

result.push({
id:post.id,
ok:r.ok,
data
});

}catch(e){

result.push({
id:post.id,
ok:false,
error:e.message
});

}

}

res.json(result);

}catch(e){

res.status(500).json({
error:e.message
});

}

});

return router;
};
