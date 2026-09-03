# Event Catalog

| Événement | Producteur | Consommateurs pressentis | Version |
|---|---|---|---|
| AgencyCreated | ERP / Agency | Website, Google, Brand | v1 |
| AgencyUpdated | ERP / Agency | Website, SEO, Google | v1 |
| BrandUpdated | Brand Engine | Website, Campaign, Media | v1 |
| ReviewImported | Google Business Engine | Website, SEO Brain | v1 |
| GoogleHoursUpdated | Google Business Engine | Website, SEO | v1 |
| GoogleSyncCompleted | Google Business Engine | Dashboard, SEO Brain | v1 |
| CampaignPublished | Marketing Engine | Website, Analytics | v1 |
| DestinationUpdated | Travel Core | Website, SEO, Campaign | v1 |
| PagePublished | Publishing Engine | Sitemap, Cache, Analytics | v1 |
| AssetPublished | Asset Engine | Website, Campaign, Search | v1 |

Chaque événement doit contenir : `eventId`, `eventType`, `eventVersion`, `tenantId`, `occurredAt`, `producer`, `payload`.
