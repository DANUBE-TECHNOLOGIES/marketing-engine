"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPublishedPersonKnowledge } from "../../lib/website-builder/knowledge-person-selector";

function optionLabel(person) {
  return person.slug
    ? `${person.title} — ${person.slug}`
    : person.title;
}

export default function KnowledgePersonSelect({
  value,
  onChange,
}) {
  const currentValue = String(value || "").trim();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadPeople() {
      try {
        setLoading(true);
        setError("");

        const items = await fetchPublishedPersonKnowledge({
          signal: controller.signal,
        });

        if (active) {
          setPeople(items);
        }
      } catch (loadError) {
        if (active && loadError?.name !== "AbortError") {
          setError(loadError?.message || "Impossible de charger les conseillers publiés.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPeople();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const options = useMemo(() => {
    const known = new Set(people.map((person) => person.id));
    const result = people.map((person) => ({
      value: person.id,
      label: optionLabel(person),
    }));

    if (currentValue && !known.has(currentValue)) {
      result.unshift({
        value: currentValue,
        label: `Liaison existante — ${currentValue}`,
      });
    }

    return result;
  }, [people, currentValue]);

  return (
    <div>
      <select
        value={currentValue}
        disabled={loading}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Aucune liaison Knowledge</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {loading ? (
        <small>Chargement des conseillers publiés…</small>
      ) : null}

      {error ? (
        <small>
          {error} La liaison existante est conservée tant que tu ne la modifies pas.
        </small>
      ) : null}
    </div>
  );
}
