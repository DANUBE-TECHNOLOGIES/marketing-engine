"use strict";

const {
  buildAgencyContext,
} =
  require(
    "./agency-context"
  );

const {
  contentEnvelope,
} =
  require(
    "./content-envelope"
  );

const {
  buildGeneralSeo,
} =
  require(
    "./seo-builder"
  );

const {
  homeSections,
} =
  require(
    "./generators/home"
  );

const {
  agencySections,
} =
  require(
    "./generators/agency"
  );

const {
  servicesSections,
} =
  require(
    "./generators/services"
  );

const {
  contactSections,
} =
  require(
    "./generators/contact"
  );

const {
  partnersSections,
} =
  require(
    "./generators/partners"
  );

class DefaultContentBuilder {
  context(
    agency,
    site
  ) {
    return buildAgencyContext(
      agency,
      site
    );
  }

  buildSections(
    page,
    agency,
    site
  ) {
    const context =
      this.context(
        agency,
        site
      );

    const pageType =
      String(
        page?.pageType ||
        page?.type ||
        ""
      ).toUpperCase();

    let sections;

    switch (
      pageType
    ) {
      case "HOME":
        sections =
          homeSections(
            context
          );
        break;

      case "AGENCY":
        sections =
          agencySections(
            context
          );
        break;

      case "SERVICES":
        sections =
          servicesSections(
            context
          );
        break;

      case "CONTACT":
        sections =
          contactSections(
            context
          );
        break;

      case "PARTNERS":
      case "PARTENAIRES":
        sections =
          partnersSections(
            context
          );
        break;

      default:
        sections =
          [];
        break;
    }

    return sections.map(
      section => ({
        ...section,

        content:
          contentEnvelope(
            section.content,
            {
              variables: {
                agencyId:
                  context.agency.id,

                agencyName:
                  context.agency.name,

                city:
                  context.agency.city,
              },
            }
          ),
      })
    );
  }

  buildPage(
    page,
    agency,
    site
  ) {
    const context =
      this.context(
        agency,
        site
      );

    const pageType =
      String(
        page?.pageType ||
        page?.type ||
        ""
      ).toUpperCase();

    return {
      pageType,

      seo:
        buildGeneralSeo(
          pageType,
          context
        ),

      sections:
        this.buildSections(
          page,
          agency,
          site
        ),
    };
  }
}

module.exports =
  DefaultContentBuilder;
