// Sector primers covering the operational reality of each vertical a swi-tch
// recruiter is likely to work in. Strictly factual: process characteristics,
// commonly-used WMS products, KPIs that matter, well-known names. No
// "vendor X is better than vendor Y" judgments.

export type SectorPrimer = {
  slug: string
  name: string
  oneLiner: string
  whatMakesItSpecial: string
  commonWmsChoices: string[]
  keyMetrics: string[]
  topicsToExplore: string[]
  exampleCompanies: string[]
}

export const SECTORS: SectorPrimer[] = [
  {
    slug: 'retail-b2c',
    name: 'Retail (B2C)',
    oneLiner: 'High-volume, multi-channel distribution to stores and end consumers, dominated by peak seasonality.',
    whatMakesItSpecial:
      'B2C retail warehouses live and die by peak. A typical large retailer doubles, triples or quadruples daily volume around Black Friday / Cyber Week, holiday and back-to-school windows, then runs at much lower utilisation for the rest of the year. This drives both the labour model (heavy temp / agency hiring during peak) and the automation business case (capacity has to clear peak while running profitably off-peak). Retailers also juggle multiple fulfilment archetypes from the same DC: store replenishment in case-pack quantities, e-commerce single-line / multi-line picks, and increasingly buy-online-pick-up-in-store and ship-from-store flows. The WMS has to support all of those concurrently and integrate with an order management system that orchestrates which channel each order ships from. Returns volume can be material, especially in apparel and footwear, requiring a serious reverse logistics flow. Carriers, parcel rates and same-day / next-day SLAs are commercially decisive — most large retailers run multi-carrier shipping at the WMS layer.',
    commonWmsChoices: [
      'Manhattan Active Warehouse Management',
      'Blue Yonder Warehouse Management',
      'SAP EWM',
      'Oracle Warehouse Management Cloud',
      'Microsoft Dynamics 365 SCM (mid-market)',
    ],
    keyMetrics: ['Order accuracy', 'OTIF', 'Pick rate', 'Throughput (peak vs off-peak)', 'Dock-to-stock time', 'Cycle time (order-to-ship)', 'Returns processing time'],
    topicsToExplore: [
      'How peak season is planned: temp labour, automation utilisation, dual-flow strategies',
      'Concurrent store replenishment and e-commerce flows from the same DC',
      'Buy-online-pick-up-in-store, ship-from-store and dark-store fulfilment patterns',
      'Returns processing and grading as a discrete process',
      'OMS / WMS integration and how stock is orchestrated across nodes',
      'Multi-carrier shipping and carton optimisation',
    ],
    exampleCompanies: ['Tesco', 'Walmart', 'Target', 'Marks & Spencer', 'John Lewis', 'Zalando', 'ASOS', 'Boots', 'JD Sports', 'Next'],
  },

  {
    slug: 'grocery-and-food',
    name: 'Grocery & Food',
    oneLiner: 'Cold chain, short shelf life, perishability and high-frequency replenishment to stores.',
    whatMakesItSpecial:
      'Grocery and food distribution is shaped by the cold chain and shelf life. Ambient, chilled and frozen are typically run as separate operating environments inside the same site, with strict temperature-monitoring and compliance regimes (HACCP in food safety, FSMA in the United States, FSA in the UK). FEFO (First-Expiry-First-Out) replenishment and allocation logic is a baseline requirement, and date code tracking flows through goods receipt, putaway, picking and dispatch. Volumes are very high and the operating model is mostly case-pick to store: a typical grocery DC ships thousands of cases per store per night, on tight delivery windows. Voice picking is heavily used because operators are gloved, in cold environments, and need to be eyes-up. Online grocery (which exploded during 2020–2022) added e-commerce micro-fulfilment, with several retailers building dedicated automated CFCs. Automation has been adopted earlier and more deeply in grocery than in much of retail — Ocado, Witron, Knapp, Swisslog and Dematic are common automation partners, and Knapp\'s OSR Shuttle and Witron\'s OPM are signature systems in this sector.',
    commonWmsChoices: [
      'Blue Yonder Warehouse Management',
      'Manhattan Active Warehouse Management',
      'SAP EWM',
      'Körber Warehouse Management',
      'Witron OPM (case-pick automation with WMS-like control)',
      'Ocado Smart Platform (vertically-integrated grocery automation)',
    ],
    keyMetrics: ['OTIF to stores', 'Dock-to-stock time', 'Pick rate (cases/hour)', 'Date-code compliance', 'Temperature compliance', 'Damage / shrink rate', 'Order accuracy'],
    topicsToExplore: [
      'Multi-temperature DC design (ambient, chill, freeze) and how the WMS handles them',
      'FEFO logic and date-code tracking through receive / putaway / pick / ship',
      'Voice picking deployments in cold environments',
      'Online grocery — micro-fulfilment, store picking, dark stores',
      'Automation partnerships with Ocado, Witron, Knapp, Swisslog, Dematic',
      'Vendor-side OTIF performance against retailer scorecards',
    ],
    exampleCompanies: ['Ocado', 'Tesco', 'Sainsbury\'s', 'Morrisons', 'Asda', 'Albertsons', 'Kroger', 'Ahold Delhaize', 'Lidl', 'Aldi', 'Waitrose'],
  },

  {
    slug: '3pl',
    name: '3PL',
    oneLiner: 'Logistics services providers running multi-customer warehouses on behalf of brand-owner clients.',
    whatMakesItSpecial:
      'Third-party logistics providers (3PLs) operate warehouses on behalf of multiple brand-owner customers, often co-located in the same building or even sharing the same equipment. The defining requirements are multi-tenant data isolation, customer-specific process variants, and very granular activity-based billing — the WMS has to know how to charge each customer for each receipt, putaway, pick, pack, value-added service and storage day. Onboarding a new customer typically has to happen in weeks rather than months: a strong configuration toolkit (rather than per-customer custom code) is therefore a major operational asset. 3PLs run a wide range of process variants — case-pick for grocery clients, e-commerce piece-pick for retail clients, kitting and assembly, returns handling, refurbishment — and tend to favour WMS products that are flexible and have an explicit billing module. Manhattan, Körber, Blue Yonder, Oracle WMS Cloud and Infor WMS all have strong 3PL footprints. The largest global 3PLs (DHL Supply Chain, GXO, Kuehne+Nagel, DSV, GEODIS, XPO Logistics, Ryder, NFI) all run heterogeneous WMS estates with multiple platforms in parallel.',
    commonWmsChoices: [
      'Manhattan Active Warehouse Management',
      'Manhattan SCALE',
      'Körber Warehouse Management (HighJump)',
      'Blue Yonder Warehouse Management',
      'Oracle Warehouse Management Cloud (LogFire)',
      'Infor WMS',
    ],
    keyMetrics: ['Customer SLA attainment', 'OTIF per customer', 'Throughput per labour hour', 'Storage utilisation', 'Activity-based billing accuracy', 'New-customer onboarding time'],
    topicsToExplore: [
      'Multi-tenant deployment and customer isolation in the WMS',
      'Activity-based billing — configuration, billing rules, invoicing flow',
      'Onboarding model: how fast a new client goes live',
      'Heterogeneous WMS estates inside one 3PL and how they are managed',
      'Value-added services (kitting, branding, repackaging) inside a multi-customer DC',
      'Returns flows for retail / e-commerce 3PL clients',
    ],
    exampleCompanies: ['DHL Supply Chain', 'GXO', 'Kuehne+Nagel', 'DSV', 'GEODIS', 'XPO Logistics', 'Ryder', 'NFI Industries', 'Wincanton', 'C.H. Robinson', 'Maersk Logistics'],
  },

  {
    slug: 'apparel-and-lifestyle',
    name: 'Apparel & Lifestyle',
    oneLiner: 'Style / colour / size variant explosion, intense seasonality, omnichannel, and high return rates.',
    whatMakesItSpecial:
      'Apparel and lifestyle distribution is dominated by the SKU-attribute combinatorial: a single item can exist in dozens of combinations of style, colour and size, and the assortment turns over each season. SKU counts in a single DC can run into hundreds of thousands, with a long tail of slow movers. Item-level RFID has been adopted ahead of most other sectors, particularly at brands such as Inditex (Zara), Decathlon, Macy\'s and Lululemon, because it makes inventory visibility at item granularity tractable. Returns rates are the highest of any major retail vertical, especially in pure-play online — single-digit percentages in stores, double digits and sometimes 30%+ for online clothing, depending on the brand. Reverse logistics is therefore a first-class operational flow, with grading, refurbishment, repackaging and channel-routing decisions made on every returned unit. Omnichannel fulfilment is mature: ship-from-store, BOPIS and dark-store flows are standard. Many apparel brands run vertically integrated operations across DC and store, and value WMS / OMS products that pair tightly together.',
    commonWmsChoices: [
      'Manhattan Active Warehouse Management',
      'Blue Yonder Warehouse Management',
      'Körber Warehouse Management',
      'SAP EWM (vertically integrated brands)',
      'Microsoft Dynamics 365 SCM (mid-market)',
    ],
    keyMetrics: ['Inventory accuracy (item-level RFID)', 'Return rate', 'Returns disposition cycle time', 'OTIF', 'Order accuracy', 'Pick rate (eaches/hour)'],
    topicsToExplore: [
      'Item-level RFID — programme experience, store and DC processes',
      'Returns operations, grading and disposition',
      'Omnichannel fulfilment: BOPIS, ship-from-store, dark stores',
      'WMS / OMS pairing in vertically integrated brand estates',
      'Seasonal labour planning and high-velocity peak periods',
      'Value-added services (steaming, hangering, ticketing) in apparel DCs',
    ],
    exampleCompanies: ['Inditex (Zara)', 'H&M', 'Uniqlo / Fast Retailing', 'PVH (Tommy Hilfiger, Calvin Klein)', 'Adidas', 'Nike', 'ASOS', 'Boohoo Group', 'Lululemon', 'Decathlon', 'Macy\'s'],
  },

  {
    slug: 'pharma-and-life-sciences',
    name: 'Pharma & Life Sciences',
    oneLiner: 'Regulated supply chain with full traceability, lot/serial control, GxP compliance and cold chain segments.',
    whatMakesItSpecial:
      'Pharma and life sciences distribution operates inside one of the most heavily regulated environments in any industry. In the United States the Drug Supply Chain Security Act (DSCSA) requires unit-level serialisation and verification across the prescription drug supply chain; in Europe the Falsified Medicines Directive (FMD) imposes equivalent requirements. The WMS must therefore handle GTIN, batch (lot), expiry and serial number at every movement, and exchange EPCIS data with trading partners and regulators. Good manufacturing and distribution practices (GMP / GDP) require validated change management — implementations and upgrades follow a formal IQ / OQ / PQ qualification process, and electronic records must comply with FDA 21 CFR Part 11. Many products require strict temperature management — refrigerated 2–8°C, frozen, and ultra-low (e.g. mRNA vaccines at –70°C). Returns handling is constrained: most prescription medicines cannot legally be reintroduced into salable stock once they have left the supply chain. Hospitals and pharmacy chains in the channel add a further layer of clinical inventory complexity (point-of-use, OR pick-lists, consignment).',
    commonWmsChoices: [
      'SAP EWM',
      'Manhattan Active Warehouse Management',
      'Tecsys Elite (notably in hospital / healthcare)',
      'Blue Yonder Warehouse Management',
      'Körber Warehouse Management',
    ],
    keyMetrics: ['Audit readiness', 'Serialisation compliance rate', 'Lot/expiry accuracy', 'Temperature excursions', 'Order accuracy', 'OTIF', 'Cycle time'],
    topicsToExplore: [
      'GxP-validated WMS implementations and IQ / OQ / PQ practice',
      'DSCSA and FMD serialisation experience',
      'EPCIS event capture and trading-partner exchange',
      'Cold chain control — refrigerated, frozen, ultra-low',
      'Hospital / clinical supply chain (Tecsys Elite, point-of-use, OR pick-lists)',
      'Returns and destruction flows under regulatory constraint',
    ],
    exampleCompanies: ['McKesson', 'Cardinal Health', 'AmerisourceBergen / Cencora', 'Alliance Healthcare / Walgreens Boots', 'AstraZeneca', 'GSK', 'Pfizer', 'Roche', 'Sanofi', 'Bayer'],
  },

  {
    slug: 'automotive-and-industrial-manufacturing',
    name: 'Automotive & Industrial Manufacturing',
    oneLiner: 'Plant-supply warehouses feeding production lines, often just-in-time, plus aftermarket parts distribution.',
    whatMakesItSpecial:
      'In automotive and industrial manufacturing the warehouse is largely an extension of the production line. Inbound flows feed kitted material to assembly stations on tightly synchronised schedules — JIT (just-in-time) and JIS (just-in-sequence) — and a missed delivery can stop the line. Kanban triggers, milkrun deliveries from suppliers, and tight integration between MES, ERP and WMS are baseline requirements. Material identification is heavy: VDA and Odette labels in Europe, AIAG labels in North America, and serial / lot tracking on safety-critical components. Aftermarket parts distribution sits alongside the plant flow but looks more like high-SKU long-tail B2B distribution: hundreds of thousands of SKUs, low volumes per SKU, but extremely high service-level expectations from dealers and end-customers. SAP EWM has a particularly strong footprint in automotive given the dominance of SAP ERP in the sector and the depth of EWM\'s material flow control capabilities for connected automation. Tier 1 suppliers (Bosch, Continental, Magna, ZF, Denso) typically run their own warehouses and integrate to OEM customer portals.',
    commonWmsChoices: [
      'SAP EWM',
      'Microsoft Dynamics 365 SCM',
      'Manhattan Active Warehouse Management',
      'Infor WMS (with industrial CloudSuite)',
      'Körber Warehouse Management',
    ],
    keyMetrics: ['Line-stop incidents', 'JIT / JIS delivery accuracy', 'Inventory accuracy', 'Aftermarket OTIF', 'Throughput', 'Cycle time'],
    topicsToExplore: [
      'JIT / JIS supply to assembly lines',
      'Plant supply warehouse design and integration with MES / ERP',
      'Aftermarket parts distribution — long-tail SKU management',
      'VDA, Odette, AIAG label and identification standards',
      'SAP EWM in automotive and the Material Flow System (MFS)',
      'Supplier portals and OEM-Tier 1 integration',
    ],
    exampleCompanies: ['Volkswagen Group', 'BMW', 'Mercedes-Benz', 'Stellantis', 'Toyota', 'Bosch', 'Continental', 'ZF Friedrichshafen', 'Magna', 'Caterpillar', 'JCB', 'Siemens'],
  },
]
