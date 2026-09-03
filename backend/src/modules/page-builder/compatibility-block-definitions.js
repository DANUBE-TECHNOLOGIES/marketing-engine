"use strict";

/*
 * Généré par MSE-24.4C à partir des contrats des blocs réellement
 * présents en PostgreSQL.
 *
 * Ce catalogue garantit la compatibilité d’édition et de persistance
 * des blocs historiques et des blocs issus des Blueprints.
 */

const COMPATIBILITY_BLOCK_DEFINITIONS =
  Object.freeze([
  {
    "type": "contact",
    "label": "Coordonnées de contact",
    "category": "conversion",
    "description": "Bloc de compatibilité issu de 18 blocs existants.",
    "singleton": false,
    "defaults": {
      "address": "",
      "agencyName": "",
      "city": "",
      "email": "",
      "phone": "",
      "postalCode": "",
      "title": ""
    },
    "fields": {
      "address": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "agencyName": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "city": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "email": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "phone": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "postalCode": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "destination-grid",
    "label": "Grille de destinations",
    "category": "travel",
    "description": "Bloc de compatibilité issu de 27 blocs existants.",
    "singleton": false,
    "defaults": {
      "items": [],
      "subtitle": "",
      "title": ""
    },
    "fields": {
      "items": {
        "type": "array",
        "maxItems": 20,
        "item": {
          "type": "object",
          "fields": {
            "href": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            },
            "title": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            }
          }
        },
        "required": true
      },
      "subtitle": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "form",
    "label": "Formulaire de contact",
    "category": "conversion",
    "description": "Bloc de compatibilité issu de 8 blocs existants.",
    "singleton": true,
    "defaults": {
      "action": "",
      "fields": [],
      "submitLabel": "",
      "title": ""
    },
    "fields": {
      "action": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "fields": {
        "type": "array",
        "maxItems": 20,
        "item": {
          "type": "object",
          "fields": {
            "label": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            },
            "name": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            },
            "type": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            }
          }
        },
        "required": true
      },
      "submitLabel": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "hours",
    "label": "Horaires d’ouverture",
    "category": "agency",
    "description": "Bloc de compatibilité issu de 9 blocs existants.",
    "singleton": true,
    "defaults": {
      "title": ""
    },
    "fields": {
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "legal",
    "label": "Contenu juridique",
    "category": "legal",
    "description": "Bloc de compatibilité issu de 18 blocs existants.",
    "singleton": true,
    "defaults": {
      "companyName": "",
      "text": "",
      "title": ""
    },
    "fields": {
      "companyName": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "text": {
        "type": "string",
        "maxLength": 30000,
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "logos",
    "label": "Logos partenaires",
    "category": "trust",
    "description": "Bloc de compatibilité issu de 27 blocs existants.",
    "singleton": false,
    "defaults": {
      "items": [],
      "title": ""
    },
    "fields": {
      "items": {
        "type": "array",
        "maxItems": 20,
        "item": {
          "type": "object",
          "fields": {
            "name": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            }
          }
        },
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "map",
    "label": "Carte et adresse",
    "category": "agency",
    "description": "Bloc de compatibilité issu de 18 blocs existants.",
    "singleton": true,
    "defaults": {
      "address": "",
      "title": ""
    },
    "fields": {
      "address": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "partners",
    "label": "Partenaires",
    "category": "trust",
    "description": "Alias historique de bloc partenaires.",
    "singleton": false,
    "defaults": {
      "title": "Nos partenaires",
      "items": []
    },
    "fields": {
      "title": {
        "type": "string",
        "maxLength": 200
      },
      "items": {
        "type": "array",
        "maxItems": 100,
        "item": {
          "type": "object",
          "fields": {
            "name": {
              "type": "string",
              "maxLength": 200
            },
            "imageUrl": {
              "type": "string",
              "maxLength": 2000,
              "nullable": true
            },
            "href": {
              "type": "string",
              "maxLength": 2000,
              "nullable": true
            },
            "alt": {
              "type": "string",
              "maxLength": 300,
              "nullable": true
            }
          }
        }
      }
    }
  },
  {
    "type": "reviews",
    "label": "Avis clients",
    "category": "trust",
    "description": "Bloc de compatibilité issu de 27 blocs existants.",
    "singleton": false,
    "defaults": {
      "items": [],
      "subtitle": "",
      "title": ""
    },
    "fields": {
      "items": {
        "type": "array",
        "maxItems": 40,
        "item": {
          "type": "string",
          "maxLength": 5000
        }
      },
      "subtitle": {
        "type": "string",
        "maxLength": 1000
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "services",
    "label": "Liste des services",
    "category": "content",
    "description": "Bloc de compatibilité issu de 18 blocs existants.",
    "singleton": false,
    "defaults": {
      "items": [],
      "title": ""
    },
    "fields": {
      "items": {
        "type": "array",
        "maxItems": 20,
        "item": {
          "type": "object",
          "fields": {
            "text": {
              "type": "string",
              "maxLength": 30000,
              "required": true
            },
            "title": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            }
          }
        },
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "team",
    "label": "Équipe",
    "category": "content",
    "description": "Bloc de compatibilité issu de 27 blocs existants.",
    "singleton": false,
    "defaults": {
      "members": [],
      "title": ""
    },
    "fields": {
      "members": {
        "type": "array",
        "maxItems": 20,
        "item": {
          "type": "object",
          "fields": {
            "description": {
              "type": "string",
              "maxLength": 30000,
              "required": true
            },
            "name": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            },
            "role": {
              "type": "string",
              "maxLength": 1000,
              "required": true
            },
            "imageAssetId": {
              "type": "string",
              "maxLength": 200
            },
            "imageUrl": {
              "type": "url",
              "nullable": true
            },
            "imageAlt": {
              "type": "string",
              "maxLength": 180
            }
          }
        },
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  },
  {
    "type": "text",
    "label": "Texte",
    "category": "content",
    "description": "Bloc de compatibilité issu de 83 blocs existants.",
    "singleton": false,
    "defaults": {
      "text": "",
      "title": ""
    },
    "fields": {
      "text": {
        "type": "string",
        "maxLength": 30000,
        "required": true
      },
      "title": {
        "type": "string",
        "maxLength": 1000,
        "required": true
      }
    }
  }
]);

module.exports = {
  COMPATIBILITY_BLOCK_DEFINITIONS,
};
