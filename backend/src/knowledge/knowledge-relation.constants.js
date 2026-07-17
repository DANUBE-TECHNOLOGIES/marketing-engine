const RELATION_TYPES = Object.freeze({
  located_in: {
    label: "Situé dans",
    inverseLabel: "Contient",
  },

  contains: {
    label: "Contient",
    inverseLabel: "Situé dans",
  },

  part_of: {
    label: "Fait partie de",
    inverseLabel: "Comprend",
  },

  related_to: {
    label: "Lié à",
    inverseLabel: "Lié à",
  },

  features: {
    label: "Met en avant",
    inverseLabel: "Mis en avant par",
  },

  recommends: {
    label: "Recommande",
    inverseLabel: "Recommandé par",
  },

  available_in: {
    label: "Disponible dans",
    inverseLabel: "Propose",
  },

  belongs_to: {
    label: "Appartient à",
    inverseLabel: "Possède",
  },

  near: {
    label: "À proximité de",
    inverseLabel: "À proximité de",
  },

  served_by: {
    label: "Desservi par",
    inverseLabel: "Dessert",
  },
});

module.exports = {
  RELATION_TYPES,
};
