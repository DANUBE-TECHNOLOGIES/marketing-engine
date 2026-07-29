"use strict";
const MultiPage = require("./multi-page-generator");
const Linking = require("./internal-linking");
const Schema = require("./schema-engine");
const Score = require("./seo-score");

function create({ sdk }) {
  const multiPage = MultiPage.create({ sdk });
  const linking = Linking.create({ sdk });
  const schemaEngine = Schema.create({ sdk });
  const scoreEngine = Score.create({ sdk });

  function buildFactory(input = {}) {
    const plan = multiPage.plan(input);
    const linkingPlan = linking.build(plan, input.linking || {});

    const pages = plan.pages.map(page => {
      const pageLinks = linkingPlan.links.find(item => item.source === page.path)?.links || [];
      const content = input.contents?.[page.type] || input.content || {};
      const schema = schemaEngine.generate({
        page,
        content,
        baseUrl: input.baseUrl,
        agency: input.agency,
        locale: input.locale
      });
      const score = scoreEngine.score({
        page,
        content,
        links: pageLinks,
        schema
      });
      return {
        ...page,
        links: pageLinks,
        schema,
        score
      };
    });

    const result = {
      version: "1.0.0",
      destination: plan.destination,
      baseSlug: plan.baseSlug,
      pages,
      summary: {
        pageCount: pages.length,
        averageScore: Math.round(
          pages.reduce((sum, page) => sum + page.score.score, 0) / Math.max(1, pages.length)
        ),
        totalLinks: pages.reduce((sum, page) => sum + page.links.length, 0)
      }
    };

    sdk.events.publish("seo.factory.completed", result.summary);
    return result;
  }

  return {
    plan: multiPage.plan,
    buildLinks: linking.build,
    generateSchema: schemaEngine.generate,
    score: scoreEngine.score,
    buildFactory
  };
}

module.exports = { create };
