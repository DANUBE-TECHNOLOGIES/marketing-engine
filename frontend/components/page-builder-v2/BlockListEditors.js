"use client";

import styles from "./VisualPageBuilder.module.css";

function moveItem(items, index, direction) {
  const target = index + direction;

  if (
    index < 0 ||
    target < 0 ||
    target >= items.length
  ) {
    return items;
  }

  const result = [...items];

  [result[index], result[target]] = [
    result[target],
    result[index],
  ];

  return result;
}

function ItemToolbar({
  index,
  count,
  onMove,
  onDelete,
}) {
  return (
    <div className={styles.itemToolbar}>
      <span>Élément {index + 1}</span>

      <div>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          title="Monter"
        >
          ↑
        </button>

        <button
          type="button"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          title="Descendre"
        >
          ↓
        </button>

        <button
          type="button"
          onClick={onDelete}
          title="Supprimer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>

      {multiline ? (
        <textarea
          rows={4}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}
    </label>
  );
}

function ListEditor({
  items,
  onChange,
  createItem,
  addLabel,
  children,
}) {
  const safeItems = Array.isArray(items) ? items : [];

  const updateItem = (index, value) => {
    onChange(
      safeItems.map((item, currentIndex) =>
        currentIndex === index ? value : item
      )
    );
  };

  const deleteItem = (index) => {
    onChange(
      safeItems.filter(
        (_, currentIndex) => currentIndex !== index
      )
    );
  };

  const move = (index, direction) => {
    onChange(moveItem(safeItems, index, direction));
  };

  return (
    <div className={styles.listEditor}>
      {safeItems.map((item, index) => (
        <section
          className={styles.listEditorItem}
          key={item.id || `${index}`}
        >
          <ItemToolbar
            index={index}
            count={safeItems.length}
            onMove={(direction) =>
              move(index, direction)
            }
            onDelete={() => deleteItem(index)}
          />

          {children({
            item,
            index,
            update: (value) =>
              updateItem(index, value),
          })}
        </section>
      ))}

      <button
        type="button"
        className={styles.addListItem}
        onClick={() =>
          onChange([...safeItems, createItem()])
        }
      >
        + {addLabel}
      </button>
    </div>
  );
}

export function FaqEditor({
  items,
  onChange,
}) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      addLabel="Ajouter une question"
      createItem={() => ({
        question: "Nouvelle question",
        answer: "Nouvelle réponse",
      })}
    >
      {({ item, update }) => (
        <>
          <Field
            label="Question"
            value={item.question}
            onChange={(question) =>
              update({
                ...item,
                question,
              })
            }
          />

          <Field
            label="Réponse"
            value={item.answer}
            multiline
            onChange={(answer) =>
              update({
                ...item,
                answer,
              })
            }
          />
        </>
      )}
    </ListEditor>
  );
}

export function FeaturesEditor({
  items,
  onChange,
}) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      addLabel="Ajouter un point fort"
      createItem={() => ({
        icon: "✦",
        title: "Nouveau point fort",
        text: "Description du point fort.",
      })}
    >
      {({ item, update }) => (
        <>
          <Field
            label="Icône"
            value={item.icon}
            onChange={(icon) =>
              update({
                ...item,
                icon,
              })
            }
          />

          <Field
            label="Titre"
            value={item.title}
            onChange={(title) =>
              update({
                ...item,
                title,
              })
            }
          />

          <Field
            label="Description"
            value={item.text}
            multiline
            onChange={(text) =>
              update({
                ...item,
                text,
              })
            }
          />
        </>
      )}
    </ListEditor>
  );
}

export function GalleryEditor({
  images,
  onChange,
}) {
  return (
    <ListEditor
      items={images}
      onChange={onChange}
      addLabel="Ajouter une image"
      createItem={() => ({
        url: "",
        alt: "",
        caption: "",
      })}
    >
      {({ item, update }) => (
        <>
          {item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.editorThumbnail}
              src={item.url}
              alt={item.alt || ""}
            />
          ) : null}

          <Field
            label="URL de l’image"
            value={item.url}
            onChange={(url) =>
              update({
                ...item,
                url,
              })
            }
          />

          <Field
            label="Texte alternatif"
            value={item.alt}
            onChange={(alt) =>
              update({
                ...item,
                alt,
              })
            }
          />

          <Field
            label="Légende"
            value={item.caption}
            multiline
            onChange={(caption) =>
              update({
                ...item,
                caption,
              })
            }
          />
        </>
      )}
    </ListEditor>
  );
}

export function TestimonialsEditor({
  items,
  onChange,
}) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      addLabel="Ajouter un témoignage"
      createItem={() => ({
        author: "Client",
        text: "Un excellent accompagnement.",
        rating: 5,
      })}
    >
      {({ item, update }) => (
        <>
          <Field
            label="Auteur"
            value={item.author}
            onChange={(author) =>
              update({
                ...item,
                author,
              })
            }
          />

          <Field
            label="Témoignage"
            value={item.text}
            multiline
            onChange={(text) =>
              update({
                ...item,
                text,
              })
            }
          />

          <Field
            label="Note"
            type="number"
            value={item.rating}
            onChange={(rating) =>
              update({
                ...item,
                rating: Math.max(
                  1,
                  Math.min(5, Number(rating) || 1)
                ),
              })
            }
          />
        </>
      )}
    </ListEditor>
  );
}

export function TeamEditor({
  members,
  onChange,
}) {
  return (
    <ListEditor
      items={members}
      onChange={onChange}
      addLabel="Ajouter un membre"
      createItem={() => ({
        id: `team-${Date.now()}`,
        name: "",
        role: "Conseiller voyage",
        imageUrl: "",
        imageAlt: "",
        bio: "",
      })}
    >
      {({ item, update }) => (
        <>
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.editorThumbnail}
              src={item.imageUrl}
              alt={item.imageAlt || item.name || "Membre de l'équipe"}
            />
          ) : null}

          <Field
            label="Nom"
            value={item.name}
            onChange={(name) =>
              update({ ...item, name })
            }
          />

          <Field
            label="Fonction"
            value={item.role}
            onChange={(role) =>
              update({ ...item, role })
            }
          />

          <Field
            label="URL de la photo"
            value={item.imageUrl}
            onChange={(imageUrl) =>
              update({ ...item, imageUrl })
            }
          />

          <Field
            label="Texte alternatif de la photo"
            value={item.imageAlt}
            onChange={(imageAlt) =>
              update({ ...item, imageAlt })
            }
          />

          <Field
            label="Présentation"
            value={item.bio}
            multiline
            onChange={(bio) =>
              update({ ...item, bio })
            }
          />
        </>
      )}
    </ListEditor>
  );
}

export function StringListEditor({
  items,
  onChange,
  label,
  addLabel,
}) {
  return (
    <ListEditor
      items={(items || []).map((value) => ({
        value,
      }))}
      onChange={(nextItems) =>
        onChange(nextItems.map((item) => item.value))
      }
      addLabel={addLabel}
      createItem={() => ({
        value: "",
      })}
    >
      {({ item, update }) => (
        <Field
          label={label}
          value={item.value}
          onChange={(value) =>
            update({
              value,
            })
          }
        />
      )}
    </ListEditor>
  );
}
