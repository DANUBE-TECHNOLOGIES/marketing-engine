class NavigationBuilder {
  build(pages) {
    const mapItem = (p) => ({ title: p.menuTitle, path: p.path, order: p.displayOrder });
    return {
      main: pages.filter((p) => p.menuLocation === "main").sort((a,b)=>a.displayOrder-b.displayOrder).map(mapItem),
      secondary: pages.filter((p) => p.menuLocation === "secondary").sort((a,b)=>a.displayOrder-b.displayOrder).map(mapItem),
      footer: pages.filter((p) => p.menuLocation === "footer").sort((a,b)=>a.displayOrder-b.displayOrder).map(mapItem)
    };
  }
}
module.exports = NavigationBuilder;
