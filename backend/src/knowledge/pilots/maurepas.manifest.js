module.exports = {
  key: "maurepas",
  language: "fr",
  entities: [
    {
      ref: "agency:maurepas",
      type: "agency",
      slug: "mondescale-maurepas",
      title: "Mondescale Maurepas",
      status: "published",
      summary: "Agence de voyages Mondescale à Maurepas.",
    },
    {
      ref: "person:anisia",
      type: "person",
      slug: "anisia-maurepas",
      title: "Anisia",
      status: "published",
      summary: "Conseillère de l'agence Mondescale Maurepas.",
    },
  ],
  relations: [
    {
      sourceRef: "person:anisia",
      targetRef: "agency:maurepas",
      relationType: "works_at",
    },
  ],
  expertise: [],
};
