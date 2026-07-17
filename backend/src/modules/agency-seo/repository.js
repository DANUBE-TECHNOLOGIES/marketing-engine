class AgencySeoRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  listSites() {
    return this.prisma.agencySeoSite.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        agency: true,
        _count: {
          select: {
            pages: true
          }
        }
      }
    });
  }

  getSiteById(id) {
    return this.prisma.agencySeoSite.findUnique({
      where: {
        id
      },
      include: {
        agency: true,
        pages: {
          orderBy: {
            createdAt: "desc"
          },
          include: {
            knowledgeEntity: true
          }
        }
      }
    });
  }

  getSiteByAgencyId(agencyId) {
    return this.prisma.agencySeoSite.findUnique({
      where: {
        agencyId
      },
      include: {
        agency: true,
        pages: true
      }
    });
  }

  createSite(data) {
    return this.prisma.agencySeoSite.create({
      data,
      include: {
        agency: true
      }
    });
  }

  updateSite(id, data) {
    return this.prisma.agencySeoSite.update({
      where: {
        id
      },
      data,
      include: {
        agency: true
      }
    });
  }

  listPages(siteId) {
    return this.prisma.agencySeoPage.findMany({
      where: {
        siteId
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        knowledgeEntity: true
      }
    });
  }

  getPageById(id) {
    return this.prisma.agencySeoPage.findUnique({
      where: {
        id
      },
      include: {
        site: {
          include: {
            agency: true
          }
        },
        knowledgeEntity: true
      }
    });
  }

  createPage(data) {
    return this.prisma.agencySeoPage.create({
      data,
      include: {
        site: true,
        knowledgeEntity: true
      }
    });
  }

  updatePage(id, data) {
    return this.prisma.agencySeoPage.update({
      where: {
        id
      },
      data,
      include: {
        site: true,
        knowledgeEntity: true
      }
    });
  }
}

module.exports = AgencySeoRepository;
