class DestinationRepository {
  constructor(prisma) { this.prisma = prisma; }

  findBySlug(tenantId, slug, publishedOnly = false) {
    const normalizedTenantId = String(tenantId || '').trim();
    const normalizedSlug = String(slug || '').trim();
    if (!normalizedTenantId || !normalizedSlug) return null;

    return this.prisma.destination.findFirst({
      where: {
        tenantId: normalizedTenantId,
        slug: normalizedSlug,
        ...(publishedOnly ? { status: 'published' } : {})
      },
      include: {
        sections: { orderBy: { position: 'asc' } },
        faqs: { orderBy: { position: 'asc' } }
      }
    });
  }

  findPublicSite(slug, tenantId) {
    const normalizedTenantId = String(tenantId || '').trim();
    if (!normalizedTenantId) return null;
    return this.prisma.agencySite.findFirst({
      where: { slug, tenantId: normalizedTenantId },
      include: {
        agency: true,
        pages: {
          where: { status: 'published', published: true },
          orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            pageType: true,
            status: true,
            published: true,
          },
        },
      }
    });
  }

  list(tenantId, publishedOnly = false) {
    const normalizedTenantId = String(tenantId || '').trim();
    if (!normalizedTenantId) return [];

    return this.prisma.destination.findMany({
      where: {
        tenantId: normalizedTenantId,
        ...(publishedOnly ? { status: 'published' } : {})
      },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { sections: true, faqs: true } } }
    });
  }

  async upsertBudapest(tenantId) {
    const normalizedTenantId = String(tenantId || '').trim();
    if (!normalizedTenantId) {
      const error = new Error('Le tenant est obligatoire pour initialiser une destination.');
      error.statusCode = 400;
      error.code = 'DESTINATION_TENANT_REQUIRED';
      throw error;
    }

    const destination = await this.prisma.destination.upsert({
      where: {
        tenantId_slug: {
          tenantId: normalizedTenantId,
          slug: 'budapest'
        }
      },
      update: {
        name: 'Budapest', country: 'Hongrie', region: 'Europe centrale', type: 'city-break', status: 'published',
        tagline: 'La perle du Danube, entre palais, bains thermaux et art de vivre.',
        summary: "Budapest réunit deux villes historiques, Buda et Pest, dans un décor monumental traversé par le Danube. Une destination idéale pour un city-break culturel, gourmand et dépaysant.",
        heroImageUrl: 'https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=2000&q=85',
        seoTitle: 'Voyage à Budapest : guide, conseils et devis | Mondescale Voyages',
        seoDescription: 'Préparez votre voyage à Budapest avec Mondescale Voyages : thermes, monuments, quartiers, conseils pratiques et demande de devis personnalisé.',
        latitude: 47.4979, longitude: 19.0402,
        bestTime: "D’avril à juin et de septembre à octobre", idealDuration: '3 à 5 jours', currency: 'Forint hongrois (HUF)', language: 'Hongrois',
        highlights: ['Le Parlement hongrois', 'Le château de Buda', 'Les bains Széchenyi', 'Le quartier juif', 'Une croisière sur le Danube'],
        audiences: ['couple', 'amis', 'culture', 'gastronomie', 'bien-être'],
        metadata: { source: 'mondescale', version: 1 }
      },
      create: {
        tenantId: normalizedTenantId,
        name: 'Budapest', slug: 'budapest', country: 'Hongrie', region: 'Europe centrale', type: 'city-break', status: 'published',
        tagline: 'La perle du Danube, entre palais, bains thermaux et art de vivre.',
        summary: "Budapest réunit deux villes historiques, Buda et Pest, dans un décor monumental traversé par le Danube. Une destination idéale pour un city-break culturel, gourmand et dépaysant.",
        heroImageUrl: 'https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=2000&q=85',
        seoTitle: 'Voyage à Budapest : guide, conseils et devis | Mondescale Voyages',
        seoDescription: 'Préparez votre voyage à Budapest avec Mondescale Voyages : thermes, monuments, quartiers, conseils pratiques et demande de devis personnalisé.',
        latitude: 47.4979, longitude: 19.0402,
        bestTime: "D’avril à juin et de septembre à octobre", idealDuration: '3 à 5 jours', currency: 'Forint hongrois (HUF)', language: 'Hongrois',
        highlights: ['Le Parlement hongrois', 'Le château de Buda', 'Les bains Széchenyi', 'Le quartier juif', 'Une croisière sur le Danube'],
        audiences: ['couple', 'amis', 'culture', 'gastronomie', 'bien-être'],
        metadata: { source: 'mondescale', version: 1 }
      }
    });

    const sections = [
      { key: 'why', position: 10, type: 'editorial', title: 'Pourquoi partir à Budapest ?', content: { paragraphs: ["Budapest séduit par son équilibre rare entre patrimoine impérial et énergie contemporaine. Sur la rive de Buda, les collines, le château et les ruelles historiques dominent le fleuve. Sur la rive de Pest, cafés, marchés, musées et quartiers vivants rythment la journée.", "La capitale hongroise se découvre aussi par l’eau : croisière au coucher du soleil, bains thermaux centenaires et panoramas sur les ponts illuminés."] } },
      { key: 'must-see', position: 20, type: 'cards', title: 'Les incontournables', content: { items: [
        { title: 'Le Parlement', text: 'Une silhouette néogothique spectaculaire au bord du Danube.' },
        { title: 'Le château de Buda', text: 'Un quartier historique offrant l’un des plus beaux panoramas sur Pest.' },
        { title: 'Les bains Széchenyi', text: 'L’expérience thermale emblématique de Budapest, été comme hiver.' },
        { title: 'Le quartier juif', text: 'Synagogues, street art, gastronomie et célèbres ruin bars.' },
        { title: 'La basilique Saint-Étienne', text: 'Un monument majeur au cœur de la ville et une terrasse panoramique.' },
        { title: 'Le Danube de nuit', text: 'Les façades et les ponts illuminés composent un décor inoubliable.' }
      ] } },
      { key: 'thermal', position: 30, type: 'feature', title: 'Une capitale thermale unique', content: { eyebrow: 'Anecdote Mondescale', text: 'Budapest compte plus de 120 sources d’eau chaude naturelles. Les bains font partie du quotidien local et constituent une expérience incontournable lors d’un premier séjour.' } },
      { key: 'itinerary', position: 40, type: 'timeline', title: 'Budapest en 4 jours', content: { items: [
        { day: 'Jour 1', title: 'Pest monumental', text: 'Parlement, basilique Saint-Étienne, avenue Andrássy et dîner dans le centre.' },
        { day: 'Jour 2', title: 'Buda historique', text: 'Palais royal, bastion des Pêcheurs, église Matthias et panorama sur le Danube.' },
        { day: 'Jour 3', title: 'Thermes et quartiers', text: 'Bains Széchenyi, marché central, quartier juif et ruin bar.' },
        { day: 'Jour 4', title: 'Danube et liberté', text: 'Île Marguerite, dernières découvertes puis croisière au coucher du soleil.' }
      ] } },
      { key: 'advice', position: 50, type: 'tips', title: 'Les conseils de votre agence', content: { items: [
        'Réservez les bains et la visite du Parlement à l’avance.',
        'Prévoyez des chaussures confortables : la ville se découvre très bien à pied.',
        'Gardez une soirée pour admirer Budapest depuis le Danube.',
        'Demandez-nous un hôtel central proche d’une ligne de métro ou de tramway.'
      ] } }
    ];

    for (const s of sections) {
      await this.prisma.destinationSection.upsert({
        where: { destinationId_key: { destinationId: destination.id, key: s.key } },
        update: s,
        create: { destinationId: destination.id, ...s }
      });
    }

    const faqs = [
      ['Combien de jours faut-il pour visiter Budapest ?', 'Trois jours permettent de découvrir les essentiels. Quatre à cinq jours offrent un rythme plus confortable avec les thermes et une excursion.'],
      ['Quelle est la meilleure période pour partir ?', 'Le printemps et le début de l’automne offrent des températures agréables. Décembre est également apprécié pour les marchés de Noël.'],
      ['Budapest est-elle adaptée à un voyage en famille ?', 'Oui. Les transports sont simples, les espaces verts nombreux et plusieurs activités conviennent aux enfants.'],
      ['Faut-il changer de l’argent avant le départ ?', 'La monnaie est le forint hongrois. Les cartes sont largement acceptées, mais quelques espèces restent utiles pour les petits achats.']
    ];

    for (let i = 0; i < faqs.length; i += 1) {
      await this.prisma.destinationFaq.upsert({
        where: { destinationId_position: { destinationId: destination.id, position: i + 1 } },
        update: { question: faqs[i][0], answer: faqs[i][1] },
        create: { destinationId: destination.id, position: i + 1, question: faqs[i][0], answer: faqs[i][1] }
      });
    }

    return this.findBySlug(normalizedTenantId, 'budapest');
  }
}

module.exports = DestinationRepository;
