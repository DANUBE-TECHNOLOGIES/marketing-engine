import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function defaultFaqTitle(site) {
  const city = clean(site?.agency?.city || site?.city);
  return city
    ? `Questions fréquentes sur votre agence à ${city}`
    : "Questions fréquentes sur votre agence";
}

function resolvedFaqTitle(section, site) {
  const fallback = defaultFaqTitle(site);
  const configured = clean(getSectionTitle(section, fallback));
  if (/questions\s+fr[eé]quentes\s+sur\s+(accueil|home)/i.test(configured)) {
    return fallback;
  }
  return configured || fallback;
}

function validFaqItems(section) {
  return getItems(section, ["items", "questions", "faqs"])
    .map((item) => ({
      ...item,
      question: clean(item?.question || item?.title),
      answer: clean(item?.answer || item?.text || item?.description),
    }))
    .filter((item) => item.question && item.answer);
}

export default function FaqRenderer({ section, site }) {
  const content = getSectionContent(section);
  const items = validFaqItems(section);
  const introduction = clean(content.introduction || content.description || content.text);
  if (!items.length) return null;

  return (
    <section className="public-site-section public-site-faq">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Vos questions</p>
        <h2>{resolvedFaqTitle(section, site)}</h2>
        {introduction ? <p className="public-site-section-intro">{introduction}</p> : null}
        <div className="public-site-faq-list">
          {items.map((item, index) => (
            <details key={item.id || item.question || index}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export {
  clean,
  defaultFaqTitle,
  resolvedFaqTitle,
  validFaqItems,
};
