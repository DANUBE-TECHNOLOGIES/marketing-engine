function buildTopology(pages) {
  const byKey = new Map(pages.map((page) => [page.key, page]));
  return pages.map((page) => ({
    key: page.key,
    parentKey: page.parentKey || null,
    children: pages.filter((candidate) => candidate.parentKey === page.key).map((candidate) => candidate.key),
    related: page.key === 'pillar'
      ? []
      : pages
          .filter((candidate) => candidate.key !== page.key && candidate.key !== 'pillar')
          .sort((a, b) => Math.abs(a.priority - page.priority) - Math.abs(b.priority - page.priority))
          .slice(0, 3)
          .map((candidate) => candidate.key),
    orphan: Boolean(page.parentKey && !byKey.has(page.parentKey))
  }));
}

module.exports = { buildTopology };
