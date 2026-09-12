"use strict";

const crypto = require("crypto");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TICKET =
  "MSE-25.208 partner directory finalization";

const SITE_ID =
  "cms8n8jdu00j7n91axodw128b";

const PAGE_ID =
  "cms8n8my200kjn91a7p89a4v6";

const BLOCK_ID =
  "cmsztn4m400i6tdhd1z398m2t";

const SNAPSHOT =
  "/var/tmp/mse-25-208-lamorlaye-partner-directory-finalize-v1.snapshot.json";

const DESIRED_CONTENT = {
  title:
    "Voyagistes et partenaires référencés",

  text:
    "Le catalogue ci-dessous présente les partenaires actuellement publiés par Mondescale. Stéphanie vous aide à identifier ceux qui correspondent aux critères de votre projet."
};

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    return Object.keys(value)
      .sort()
      .reduce((out, key) => {
        out[key] = stable(value[key]);
        return out;
      }, {});
  }

  return value;
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(stable(value))
    )
    .digest("hex");
}

function assert(value, message) {
  if (!value) {
    throw new Error(
      `ASSERTION FAILED: ${message}`
    );
  }
}

async function load(client = prisma) {
  const page =
    await client.agencySitePage.findUnique({
      where: {
        id: PAGE_ID
      },
      include: {
        blocks: true,
        sections: true
      }
    });

  assert(
    page,
    "Partners page missing"
  );

  const block =
    page.blocks.find(
      item => item.id === BLOCK_ID
    );

  assert(
    block,
    "Partners trigger block missing"
  );

  return {
    page,
    block
  };
}

function protectedState(state) {
  return {
    page: {
      id: state.page.id,
      siteId: state.page.siteId,
      parentId: state.page.parentId,
      title: state.page.title,
      slug: state.page.slug,
      path: state.page.path,
      pageType: state.page.pageType,
      menuTitle: state.page.menuTitle,
      menuLocation:
        state.page.menuLocation,
      displayOrder:
        state.page.displayOrder,
      seoTitle:
        state.page.seoTitle,
      metaDescription:
        state.page.metaDescription,
      h1:
        state.page.h1,
      schemaType:
        state.page.schemaType,
      status:
        state.page.status,
      published:
        state.page.published,

      blocks:
        state.page.blocks
          .filter(
            block =>
              block.id !== BLOCK_ID
          )
          .map(block => ({
            id: block.id,
            pageId: block.pageId,
            blockType:
              block.blockType,
            name: block.name,
            content:
              block.content,
            settings:
              block.settings,
            seo:
              block.seo,
            displayOrder:
              block.displayOrder,
            status:
              block.status,
            visibleDesktop:
              block.visibleDesktop,
            visibleMobile:
              block.visibleMobile,
            version:
              block.version
          }))
          .sort(
            (a, b) =>
              a.id.localeCompare(b.id)
          ),

      sections:
        state.page.sections
          .map(section => ({
            id: section.id,
            pageId:
              section.pageId,
            sectionType:
              section.sectionType,
            jsonContent:
              section.jsonContent,
            displayOrder:
              section.displayOrder,
            status:
              section.status
          }))
          .sort(
            (a, b) =>
              a.id.localeCompare(b.id)
          )
    }
  };
}

async function rollback() {
  assert(
    fs.existsSync(SNAPSHOT),
    "snapshot missing"
  );

  const data =
    JSON.parse(
      fs.readFileSync(
        SNAPSHOT,
        "utf8"
      )
    );

  await prisma.pageBlock.update({
    where: {
      id: BLOCK_ID
    },
    data: {
      content:
        data.block.content,
      visibleDesktop:
        data.block.visibleDesktop,
      visibleMobile:
        data.block.visibleMobile,
      version:
        data.block.version
    }
  });

  console.log(
    JSON.stringify({
      ticket: TICKET,
      mode: "ROLLBACK",
      restored: true
    }, null, 2)
  );
}

async function main() {
  if (
    process.argv.includes("--rollback")
  ) {
    return rollback();
  }

  const before =
    await load();

  assert(
    before.page.siteId === SITE_ID,
    "site identity changed"
  );

  assert(
    before.page.slug ===
      "partenaires",
    "page slug changed"
  );

  assert(
    before.page.seoTitle ===
      "Voyagistes & partenaires | Mondescale Lamorlaye",
    "post-208 SEO state missing"
  );

  assert(
    before.page.h1 ===
      "Voyagistes et partenaires de votre agence à Lamorlaye",
    "post-208 H1 state missing"
  );

  assert(
    before.block.blockType ===
      "logos",
    "trigger block type changed"
  );

  assert(
    before.block.version === 2,
    "trigger block version is not post-208"
  );

  assert(
    before.block.visibleDesktop ===
      false &&
    before.block.visibleMobile ===
      false,
    "expected hidden post-208 trigger state missing"
  );

  const fingerprintBefore =
    hash(
      protectedState(before)
    );

  const report = {
    ticket: TICKET,
    mode:
      process.env
        .MSE_25_208_DIRECTORY_CONFIRM ===
        "true"
        ? "APPLY"
        : "DRY_RUN",

    protectedFingerprintBefore:
      fingerprintBefore,

    desired: {
      blockId:
        BLOCK_ID,
      content:
        DESIRED_CONTENT,
      visibleDesktop:
        true,
      visibleMobile:
        true,
      version:
        3
    }
  };

  if (
    process.env
      .MSE_25_208_DIRECTORY_CONFIRM !==
    "true"
  ) {
    console.log(
      JSON.stringify({
        ...report,
        mutationPerformed:
          false
      }, null, 2)
    );

    return;
  }

  assert(
    !fs.existsSync(SNAPSHOT),
    "snapshot already exists"
  );

  fs.writeFileSync(
    SNAPSHOT,
    JSON.stringify({
      ticket: TICKET,
      createdAt:
        new Date().toISOString(),

      block: {
        id:
          before.block.id,
        content:
          before.block.content,
        visibleDesktop:
          before.block
            .visibleDesktop,
        visibleMobile:
          before.block
            .visibleMobile,
        version:
          before.block.version
      },

      protectedFingerprint:
        fingerprintBefore
    }, null, 2),
    {
      mode: 0o600
    }
  );

  await prisma.pageBlock.update({
    where: {
      id: BLOCK_ID
    },
    data: {
      content:
        DESIRED_CONTENT,
      visibleDesktop:
        true,
      visibleMobile:
        true,
      version:
        3
    }
  });

  const after =
    await load();

  const fingerprintAfter =
    hash(
      protectedState(after)
    );

  assert(
    fingerprintBefore ===
      fingerprintAfter,
    "protected Partners state changed"
  );

  assert(
    after.block.visibleDesktop ===
      true &&
    after.block.visibleMobile ===
      true &&
    after.block.version === 3,
    "directory trigger final state invalid"
  );

  assert(
    after.block.content?.title ===
      DESIRED_CONTENT.title,
    "directory title invalid"
  );

  console.log(
    JSON.stringify({
      ...report,
      mutationPerformed:
        true,
      snapshot:
        SNAPSHOT,
      protectedFingerprintAfter:
        fingerprintAfter,
      protectedUnchanged:
        true,
      finalState: {
        blockId:
          after.block.id,
        version:
          after.block.version,
        visibleDesktop:
          after.block
            .visibleDesktop,
        visibleMobile:
          after.block
            .visibleMobile,
        content:
          after.block.content
      }
    }, null, 2)
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(
    () => prisma.$disconnect()
  );
