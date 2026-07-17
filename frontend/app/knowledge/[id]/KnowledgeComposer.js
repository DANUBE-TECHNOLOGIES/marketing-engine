"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const styles = {
  card: {
    marginTop: "24px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow:
      "0 8px 24px rgba(15, 23, 42, 0.05)",
    overflow: "hidden",
  },

  header: {
    padding: "20px 22px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },

  previewShell: {
    padding: "22px",
    background: "#f8fafc",
  },

  browser: {
    overflow: "hidden",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow:
      "0 18px 40px rgba(15, 23, 42, 0.08)",
  },

  browserBar: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "11px 14px",
    background: "#e2e8f0",
    borderBottom: "1px solid #cbd5e1",
  },

  dot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#94a3b8",
  },

  address: {
    marginLeft: "10px",
    flex: 1,
    padding: "6px 10px",
    borderRadius: "7px",
    background: "#ffffff",
    color: "#64748b",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  hero: {
    position: "relative",
    minHeight: "360px",
    display: "flex",
    alignItems: "flex-end",
    background:
      "linear-gradient(135deg, #0f766e, #0f172a)",
  },

  heroImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(15,23,42,.9), rgba(15,23,42,.08))",
  },

  heroContent: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    padding: "36px",
    color: "#ffffff",
  },

  content: {
    maxWidth: "980px",
    margin: "0 auto",
    padding: "34px 28px 44px",
  },

  section: {
    marginBottom: "30px",
  },

  badge: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: "999px",
    background: "#e2e8f0",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 700,
  },

  badgeDark: {
    background: "rgba(255,255,255,.16)",
    color: "#ffffff",
    backdropFilter: "blur(5px)",
  },

  relationGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(210px, 1fr))",
    gap: "12px",
  },

  relationCard: {
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "11px",
    background: "#f8fafc",
  },

  gallery: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "12px",
  },

  galleryImage: {
    width: "100%",
    aspectRatio: "4 / 3",
    objectFit: "cover",
    borderRadius: "10px",
    background: "#e2e8f0",
  },

  empty: {
    padding: "22px",
    border: "1px dashed #cbd5e1",
    borderRadius: "11px",
    textAlign: "center",
    color: "#64748b",
  },

  error: {
    margin: "20px",
    padding: "12px 14px",
    borderRadius: "9px",
    background: "#fee2e2",
    color: "#991b1b",
  },

  button: {
    minHeight: "38px",
    padding: "8px 12px",
    border: 0,
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
    background: "#e2e8f0",
    color: "#1e293b",
  },
};

function getEntityPayload(result) {
  return result?.data || result || null;
}

function getBlocksPayload(result) {
  if (Array.isArray(result?.data)) {
    return result.data;
  }

  if (Array.isArray(result?.data?.blocks)) {
    return result.data.blocks;
  }

  if (Array.isArray(result?.blocks)) {
    return result.blocks;
  }

  return [];
}

function getMediaPayload(result) {
  return {
    data:
      Array.isArray(result?.data)
        ? result.data
        : [],
    primary:
      result?.primary || null,
  };
}

function getRelationsPayload(result) {
  return {
    outgoing:
      result?.data?.outgoing || [],
    incoming:
      result?.data?.incoming || [],
  };
}

function normalizeBlockType(block) {
  return String(
    block?.type ||
    block?.blockType ||
    "text"
  ).toLowerCase();
}

function normalizeBlockContent(block) {
  const content =
    block?.content ??
    block?.data ??
    block?.payload ??
    block?.value ??
    "";

  if (typeof content === "string") {
    return {
      text: content,
    };
  }

  if (
    content &&
    typeof content === "object"
  ) {
    return content;
  }

  return {
    text: "",
  };
}

function renderBlock(block) {
  const type = normalizeBlockType(block);
  const content =
    normalizeBlockContent(block);

  const title =
    block?.title ||
    content?.title ||
    content?.heading ||
    null;

  const text =
    content?.text ||
    content?.body ||
    content?.content ||
    block?.text ||
    "";

  if (
    type.includes("heading") ||
    type === "title"
  ) {
    return (
      <section
        key={block.id}
        style={styles.section}
      >
        <h2
          style={{
            marginBottom: "10px",
            fontSize: "30px",
            lineHeight: 1.2,
          }}
        >
          {title || text || "Titre de section"}
        </h2>
      </section>
    );
  }

  if (
    type.includes("hero") ||
    type.includes("intro")
  ) {
    return (
      <section
        key={block.id}
        style={styles.section}
      >
        {title ? (
          <h2>{title}</h2>
        ) : null}

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.7,
            color: "#334155",
          }}
        >
          {text}
        </p>
      </section>
    );
  }

  if (
    type.includes("list") &&
    Array.isArray(content?.items)
  ) {
    return (
      <section
        key={block.id}
        style={styles.section}
      >
        {title ? (
          <h2>{title}</h2>
        ) : null}

        <ul
          style={{
            paddingLeft: "22px",
            lineHeight: 1.8,
            color: "#334155",
          }}
        >
          {content.items.map(
            (item, index) => (
              <li key={index}>
                {typeof item === "string"
                  ? item
                  : item?.label ||
                    item?.text ||
                    JSON.stringify(item)}
              </li>
            )
          )}
        </ul>
      </section>
    );
  }

  if (
    type.includes("quote") ||
    type.includes("highlight")
  ) {
    return (
      <blockquote
        key={block.id}
        style={{
          margin: "0 0 30px",
          padding: "20px 22px",
          borderLeft: "5px solid #0f766e",
          background: "#f0fdfa",
          color: "#134e4a",
          fontSize: "20px",
          lineHeight: 1.55,
        }}
      >
        {text}
      </blockquote>
    );
  }

  if (
    type.includes("cta")
  ) {
    return (
      <section
        key={block.id}
        style={{
          marginBottom: "30px",
          padding: "24px",
          borderRadius: "14px",
          background: "#0f766e",
          color: "#ffffff",
        }}
      >
        <h2
          style={{
            marginTop: 0,
          }}
        >
          {title ||
            "Préparez votre prochain voyage"}
        </h2>

        {text ? (
          <p
            style={{
              lineHeight: 1.6,
            }}
          >
            {text}
          </p>
        ) : null}

        <button
          type="button"
          style={{
            marginTop: "8px",
            padding: "11px 16px",
            border: 0,
            borderRadius: "9px",
            background: "#ffffff",
            color: "#0f766e",
            fontWeight: 800,
          }}
        >
          Demander un devis
        </button>
      </section>
    );
  }

  return (
    <section
      key={block.id}
      style={styles.section}
    >
      {title ? (
        <h2>{title}</h2>
      ) : null}

      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.75,
          color: "#334155",
          fontSize: "16px",
        }}
      >
        {text ||
          JSON.stringify(
            content,
            null,
            2
          )}
      </div>
    </section>
  );
}

export default function KnowledgeComposer({
  entityId,
}) {
  const [entity, setEntity] =
    useState(null);

  const [blocks, setBlocks] =
    useState([]);

  const [media, setMedia] =
    useState([]);

  const [primaryMedia, setPrimaryMedia] =
    useState(null);

  const [relations, setRelations] =
    useState({
      outgoing: [],
      incoming: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadComposer = useCallback(
    async () => {
      if (!entityId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const requests = [
          fetch(
            `/api/knowledge/${entityId}`,
            {
              cache: "no-store",
            }
          ),

          fetch(
            `/api/knowledge/${entityId}/blocks`,
            {
              cache: "no-store",
            }
          ),

          fetch(
            `/api/knowledge/${entityId}/media`,
            {
              cache: "no-store",
            }
          ),

          fetch(
            `/api/knowledge/${entityId}/relations`,
            {
              cache: "no-store",
            }
          ),
        ];

        const responses =
          await Promise.all(requests);

        const payloads =
          await Promise.all(
            responses.map(
              (response) =>
                response.json().catch(
                  () => ({})
                )
            )
          );

        const failure =
          responses.find(
            (response) => !response.ok
          );

        if (failure) {
          const index =
            responses.indexOf(failure);

          throw new Error(
            payloads[index]?.error?.message ||
            "Impossible de composer l’aperçu."
          );
        }

        setEntity(
          getEntityPayload(payloads[0])
        );

        setBlocks(
          getBlocksPayload(payloads[1])
        );

        const mediaPayload =
          getMediaPayload(payloads[2]);

        setMedia(mediaPayload.data);
        setPrimaryMedia(
          mediaPayload.primary
        );

        setRelations(
          getRelationsPayload(payloads[3])
        );
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    },
    [entityId]
  );

  useEffect(() => {
    loadComposer();
  }, [loadComposer]);

  const heroMedia = useMemo(
    () =>
      primaryMedia ||
      media.find(
        (item) =>
          item.type === "image"
      ) ||
      null,
    [primaryMedia, media]
  );

  const galleryMedia = useMemo(
    () =>
      media.filter(
        (item) =>
          item.type === "image" &&
          item.id !== heroMedia?.id
      ),
    [media, heroMedia]
  );

  const orderedBlocks = useMemo(
    () =>
      [...blocks].sort(
        (left, right) =>
          Number(
            left.position ??
            left.order ??
            0
          ) -
          Number(
            right.position ??
            right.order ??
            0
          )
      ),
    [blocks]
  );

  const allRelations = useMemo(
    () => [
      ...relations.outgoing,
      ...relations.incoming,
    ],
    [relations]
  );

  if (loading) {
    return (
      <section style={styles.card}>
        <div
          style={{
            padding: "24px",
          }}
        >
          Composition de l’aperçu SEO…
        </div>
      </section>
    );
  }

  return (
    <section style={styles.card}>
      <header style={styles.header}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "22px",
            }}
          >
            Knowledge Composer
          </h2>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            Aperçu simulé de la future page
            publiée sur un mini-site SEO.
          </p>
        </div>

        <button
          type="button"
          onClick={loadComposer}
          style={styles.button}
        >
          Actualiser l’aperçu
        </button>
      </header>

      {error ? (
        <div style={styles.error}>
          {error}
        </div>
      ) : null}

      {!entity ? (
        <div style={styles.empty}>
          La connaissance est introuvable.
        </div>
      ) : (
        <div style={styles.previewShell}>
          <div style={styles.browser}>
            <div style={styles.browserBar}>
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.dot} />

              <div style={styles.address}>
                https://destination.mondescale.com/
                {entity.slug || entity.id}
              </div>
            </div>

            <article>
              <section style={styles.hero}>
                {heroMedia?.url ? (
                  <img
                    src={heroMedia.url}
                    alt={
                      heroMedia.altText ||
                      entity.title ||
                      ""
                    }
                    style={styles.heroImage}
                    onError={(event) => {
                      event.currentTarget.style.display =
                        "none";
                    }}
                  />
                ) : null}

                <div style={styles.heroOverlay} />

                <div style={styles.heroContent}>
                  <div
                    style={{
                      display: "flex",
                      gap: "7px",
                      flexWrap: "wrap",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        ...styles.badge,
                        ...styles.badgeDark,
                      }}
                    >
                      {entity.type}
                    </span>

                    {entity.language ? (
                      <span
                        style={{
                          ...styles.badge,
                          ...styles.badgeDark,
                        }}
                      >
                        {entity.language}
                      </span>
                    ) : null}

                    {entity.status ? (
                      <span
                        style={{
                          ...styles.badge,
                          ...styles.badgeDark,
                        }}
                      >
                        {entity.status}
                      </span>
                    ) : null}
                  </div>

                  <h1
                    style={{
                      margin: 0,
                      maxWidth: "760px",
                      fontSize: "48px",
                      lineHeight: 1.08,
                    }}
                  >
                    {entity.title}
                  </h1>

                  {entity.summary ? (
                    <p
                      style={{
                        maxWidth: "760px",
                        margin:
                          "16px 0 0",
                        fontSize: "20px",
                        lineHeight: 1.55,
                      }}
                    >
                      {entity.summary}
                    </p>
                  ) : null}
                </div>
              </section>

              <div style={styles.content}>
                {orderedBlocks.length > 0 ? (
                  orderedBlocks.map(
                    renderBlock
                  )
                ) : (
                  <div style={styles.empty}>
                    Aucun bloc de contenu.
                    Ajoute des blocs pour construire
                    la page SEO.
                  </div>
                )}

                {allRelations.length > 0 ? (
                  <section
                    style={styles.section}
                  >
                    <h2>
                      À découvrir également
                    </h2>

                    <div
                      style={styles.relationGrid}
                    >
                      {allRelations.map(
                        (relation) => (
                          <a
                            key={`${relation.direction}-${relation.id}`}
                            href={`/knowledge/${relation.relatedEntity?.id}`}
                            style={{
                              ...styles.relationCard,
                              textDecoration:
                                "none",
                              color: "#17202a",
                            }}
                          >
                            <span
                              style={
                                styles.badge
                              }
                            >
                              {relation.label ||
                                relation.relationType}
                            </span>

                            <div
                              style={{
                                marginTop:
                                  "9px",
                                fontWeight:
                                  800,
                              }}
                            >
                              {relation
                                .relatedEntity
                                ?.title ||
                                "Connaissance liée"}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "4px",
                                color:
                                  "#64748b",
                                fontSize:
                                  "12px",
                              }}
                            >
                              {
                                relation
                                  .relatedEntity
                                  ?.type
                              }
                            </div>
                          </a>
                        )
                      )}
                    </div>
                  </section>
                ) : null}

                {galleryMedia.length > 0 ? (
                  <section
                    style={styles.section}
                  >
                    <h2>Galerie</h2>

                    <div style={styles.gallery}>
                      {galleryMedia.map(
                        (item) => (
                          <figure
                            key={item.id}
                            style={{
                              margin: 0,
                            }}
                          >
                            <img
                              src={item.url}
                              alt={
                                item.altText ||
                                item.title ||
                                ""
                              }
                              style={
                                styles.galleryImage
                              }
                            />

                            {item.title ? (
                              <figcaption
                                style={{
                                  marginTop:
                                    "7px",
                                  color:
                                    "#475569",
                                  fontSize:
                                    "13px",
                                }}
                              >
                                {item.title}
                              </figcaption>
                            ) : null}
                          </figure>
                        )
                      )}
                    </div>
                  </section>
                ) : null}

                <section
                  style={{
                    padding: "26px",
                    borderRadius: "14px",
                    background: "#0f172a",
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  <h2
                    style={{
                      marginTop: 0,
                    }}
                  >
                    Votre voyage commence ici
                  </h2>

                  <p
                    style={{
                      color: "#cbd5e1",
                      lineHeight: 1.6,
                    }}
                  >
                    Nos conseillers construisent
                    avec vous une proposition adaptée
                    à vos envies et à votre budget.
                  </p>

                  <button
                    type="button"
                    style={{
                      marginTop: "8px",
                      padding: "12px 18px",
                      border: 0,
                      borderRadius: "9px",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontWeight: 800,
                    }}
                  >
                    Demander un devis
                  </button>
                </section>
              </div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
