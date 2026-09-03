class GoogleBusinessPublisherRepository {
  constructor(prisma) { this.prisma = prisma; }
  getPublication(id) {
    return this.prisma.marketingPublication.findUnique({
      where: { id },
      include: { campaign: true }
    });
  }
  updatePublication(id, data) {
    return this.prisma.marketingPublication.update({ where: { id }, data });
  }
}
module.exports = GoogleBusinessPublisherRepository;
