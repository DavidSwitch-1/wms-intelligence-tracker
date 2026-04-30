// Factual reference profiles for the major WMS vendors recruitment consultants
// at swi-tch are likely to encounter in the market. Drawn from publicly
// available product information (vendor websites, mainstream industry coverage,
// publicised customer wins). Neutral tone — no comparative judgments, no
// strengths/weaknesses framing. Opinion-flavoured comparison belongs in the
// Ask Anything search at the bottom of the Learn tab, not here.

export type VendorProfile = {
  slug: string
  name: string
  shortName: string
  founded: number
  hq: string
  ownership: string
  oneLiner: string
  history: string
  flagshipProducts: { name: string; description: string }[]
  typicalCustomerSize: string
  industries: string[]
  knownCustomers: string[]
  topicsToExplore: string[]
  furtherReading: string[]
}

export const VENDORS: VendorProfile[] = [
  {
    slug: 'manhattan-associates',
    name: 'Manhattan Associates',
    shortName: 'Manhattan',
    founded: 1990,
    hq: 'Atlanta, Georgia, USA',
    ownership: 'Public (NASDAQ: MANH)',
    oneLiner: 'Supply chain and omnichannel commerce software vendor; widely deployed in large retail and 3PL warehouses.',
    history: 'Manhattan Associates was founded in 1990 in Atlanta and listed on NASDAQ in 1998. Its early business was built on the PkMS warehouse management product, which became one of the most widely deployed enterprise WMS systems in North American retail through the 1990s and 2000s. The company expanded by acquisition and internal development into transportation management, distributed order management and store-level point-of-sale, positioning itself as a unified supply chain and commerce vendor rather than a pure WMS supplier. SCALE, originally acquired with Logistics.com and developed for mid-market warehouse operations, sits alongside the larger Manhattan WMS in the historic product line. In 2017 the company began a multi-year rewrite of its supply chain stack onto a microservices, cloud-native architecture branded Manhattan Active. Manhattan Active Warehouse Management was released in stages from 2020 onwards and is the platform the vendor positions all new customers towards. Manhattan Associates is headquartered in Atlanta and operates engineering and delivery centres in the United States, India, Europe and Asia-Pacific. The company reports revenue in the high hundreds of millions of US dollars and is a constituent of the NASDAQ.',
    flagshipProducts: [
      { name: 'Manhattan Active Warehouse Management', description: 'Cloud-native microservices WMS, the current strategic platform for new customers.' },
      { name: 'Manhattan WMS (legacy / on-prem)', description: 'The long-established enterprise WMS product family historically deployed at large retailers and 3PLs.' },
      { name: 'Manhattan SCALE', description: 'Originally a separate mid-market WMS product line, still in use at many sites.' },
      { name: 'Manhattan Active Omni', description: 'Distributed order management, store fulfilment and POS in the omnichannel suite.' },
      { name: 'Manhattan Active Transportation Management', description: 'Cloud TMS that pairs with the WMS for end-to-end supply chain coverage.' },
    ],
    typicalCustomerSize: 'Large enterprise retailers, 3PLs and manufacturers (typically >$500M revenue, often multi-billion).',
    industries: ['Retail', '3PL', 'Apparel & Lifestyle', 'Grocery & Food', 'Wholesale Distribution', 'Manufacturing'],
    knownCustomers: ['PVH (Tommy Hilfiger, Calvin Klein)', 'Crocs', 'Asics', 'Carter\'s', 'GEODIS', 'DHL Supply Chain', 'L\'Oréal', 'Adidas', 'Sephora', 'Tractor Supply Company'],
    topicsToExplore: [
      'Experience implementing Manhattan Active Warehouse Management vs the legacy on-prem WMS',
      'Migration projects moving from PkMS or SCALE onto the Active platform',
      'Integration patterns between Manhattan WMS and SAP, Oracle or Microsoft ERPs',
      'Use of the Manhattan Active Platform extensibility model (configuration vs custom code)',
      'Cross-product programmes that combine WMS with Manhattan Active Omni',
      'Slotting, labour management and waving expertise at Manhattan-shop sites',
    ],
    furtherReading: [
      'Manhattan Associates investor relations and annual reports (manh.com)',
      'Manhattan Active product pages on manh.com',
      'Public customer case studies on the Manhattan Associates website',
    ],
  },

  {
    slug: 'blue-yonder',
    name: 'Blue Yonder',
    shortName: 'Blue Yonder',
    founded: 1985,
    hq: 'Scottsdale, Arizona, USA',
    ownership: 'Subsidiary of Panasonic Connect (Panasonic Holdings, TSE: 6752)',
    oneLiner: 'End-to-end supply chain platform spanning planning, execution and commerce; WMS lineage traces back to RedPrairie and JDA.',
    history: 'Blue Yonder is the current name of a vendor formed by a long sequence of supply chain software mergers. The WMS lineage runs through RedPrairie, which itself absorbed McHugh Software\'s warehouse products in the early 2000s. RedPrairie merged with planning vendor JDA Software in 2012 to form what was for several years known as JDA Software, then in 2018 the combined company adopted the Blue Yonder brand from a separately acquired AI start-up. Panasonic took a minority stake in 2020 and acquired the remainder of the company in 2021, making Blue Yonder a wholly owned subsidiary of Panasonic Connect. The product portfolio covers demand and supply planning, merchandise and assortment planning, transportation management, and warehouse management, sold both as on-premise software and increasingly as cloud-delivered services on Microsoft Azure. The Blue Yonder WMS is widely deployed in retail, grocery, 3PL and manufacturing operations globally, and the vendor has invested in machine-learning-driven planning capabilities marketed as the Cognitive Solutions platform. Blue Yonder is headquartered in Scottsdale, Arizona, with significant operations in Dallas, Bangalore, and across Europe.',
    flagshipProducts: [
      { name: 'Blue Yonder Warehouse Management', description: 'The WMS product line, with a multi-decade install base in retail, grocery and 3PL.' },
      { name: 'Blue Yonder Luminate Platform / Cognitive Solutions', description: 'Cloud-native planning and execution stack on Microsoft Azure.' },
      { name: 'Blue Yonder Transportation Management', description: 'TMS used standalone or paired with WMS for execution.' },
      { name: 'Blue Yonder Demand & Supply Planning', description: 'Forecasting, replenishment and S&OP suite from the JDA planning heritage.' },
    ],
    typicalCustomerSize: 'Mid-market to enterprise (typically >$250M revenue, with a heavy presence in the Fortune 500 and global retailers).',
    industries: ['Retail', 'Grocery & Food', '3PL', 'Manufacturing', 'Wholesale Distribution', 'Apparel & Lifestyle'],
    knownCustomers: ['Albertsons', 'Morrisons', 'Sainsbury\'s', 'DHL Supply Chain', 'Kuehne+Nagel', 'Procter & Gamble', 'Unilever', 'Walgreens Boots Alliance', '3M'],
    topicsToExplore: [
      'Experience with the cloud Luminate / Cognitive WMS vs older on-premise Blue Yonder WMS deployments',
      'Migrations from the RedPrairie or JDA-era WMS onto Blue Yonder cloud services',
      'Combined planning + execution programmes (e.g., Demand Planning together with WMS)',
      'Integration with Microsoft Azure-native services, including under the Panasonic Connect ownership',
      'Vertical-specific deployments in grocery (DSD, perishables) vs apparel and 3PL',
      'Approach to extending the platform: configuration, MOCA scripting on legacy, microservices on cloud',
    ],
    furtherReading: [
      'Blue Yonder corporate site (blueyonder.com)',
      'Panasonic Connect press releases regarding the Blue Yonder acquisition',
      'Public customer success stories on blueyonder.com',
    ],
  },

  {
    slug: 'korber-supply-chain',
    name: 'Körber Supply Chain',
    shortName: 'Körber',
    founded: 1946,
    hq: 'Hamburg, Germany (Körber AG); Atlanta, Georgia, USA (Körber Supply Chain Software, ex-HighJump)',
    ownership: 'Privately held — part of Körber AG, owned by the Körber-Stiftung (Körber Foundation).',
    oneLiner: 'Supply chain technology arm of Körber AG; brings together HighJump WMS, Cohesio voice, Inconso, and Aberle automation.',
    history: 'Körber AG is a long-established German industrial group, originally founded in 1946 around tobacco machinery, now a diversified technology business. The supply chain business unit was assembled through a series of acquisitions starting around 2017, when Körber acquired HighJump, the US-based WMS vendor whose own product line stretched back to the late 1990s and included the well-known products acquired from Accellos and Insight Distribution. Subsequent additions to the Körber Supply Chain portfolio included Inconso (a German WMS specialist), Cohesio Group (voice-directed picking and Honeywell-aligned mobility), Aberle and Langhammer (automation and conveyor integration), Centiro (transportation and parcel management) and enVista (consulting and software). The supply chain business is headquartered out of Atlanta for software and Hamburg for the wider group, and Körber positions the portfolio under a unified "Körber Supply Chain" brand spanning WMS, voice, automation, robotics integration and consulting. The HighJump WMS lineage continues to be the strategic execution platform, marketed as Körber Warehouse Management. As a privately held business, Körber does not publish detailed revenue, but is widely understood to be one of the larger global WMS vendors by deployment count.',
    flagshipProducts: [
      { name: 'Körber Warehouse Management (HighJump)', description: 'The flagship WMS, widely deployed in 3PL, retail and manufacturing.' },
      { name: 'Körber Warehouse Edge', description: 'Configurable WMS targeted at smaller operations and distributors.' },
      { name: 'Körber Voice (Cohesio)', description: 'Voice-directed picking and mobility, often paired with Honeywell Vocollect.' },
      { name: 'Körber Inconso WMS', description: 'European-led WMS line with a strong DACH-region install base.' },
      { name: 'Körber Aberle / Langhammer automation', description: 'Conveyor, palletising and automation integration arm.' },
    ],
    typicalCustomerSize: 'Mid-market to enterprise; a particularly broad footprint in 3PL and DACH-region manufacturing.',
    industries: ['3PL', 'Manufacturing', 'Retail', 'Apparel & Lifestyle', 'Grocery & Food', 'Pharma & Life Sciences'],
    knownCustomers: ['XPO Logistics', 'GEODIS', 'Hermes Fulfilment', 'Bosch', 'Boots', 'Lidl (selected sites)', 'Yusen Logistics'],
    topicsToExplore: [
      'Experience with Körber WMS (HighJump) vs Inconso WMS in European projects',
      'Voice deployments using Cohesio / Körber Voice with Vocollect',
      'Programmes that combine Körber WMS with Aberle or Langhammer automation',
      'Platform extensibility: HighJump scripting and the more recent low-code tooling',
      'How the multi-acquisition portfolio is rationalised on live customer accounts',
      '3PL multi-tenant deployments on Körber Warehouse Management',
    ],
    furtherReading: [
      'Körber Supply Chain product portal (koerber-supplychain.com)',
      'Körber AG annual review (koerber.com)',
      'HighJump heritage product documentation, where still publicly indexed',
    ],
  },

  {
    slug: 'sap-ewm',
    name: 'SAP Extended Warehouse Management',
    shortName: 'SAP EWM',
    founded: 2006,
    hq: 'Walldorf, Germany',
    ownership: 'Public (FRA: SAP, NYSE: SAP)',
    oneLiner: 'SAP\'s tightly integrated enterprise WMS, designed to run alongside or embedded within SAP S/4HANA.',
    history: 'SAP Extended Warehouse Management was first released by SAP in 2006 as a successor to the older WM module that had been part of the SAP R/3 ERP since the early 1990s. EWM was developed to provide the deeper functionality required by complex distribution centres — wave management, slotting, labour management, yard management and value-added services — without leaving the SAP technology stack. EWM is delivered in two main deployment modes: decentral / standalone EWM, which runs on its own SAP system and integrates to a separate ERP via core interface (CIF) and qRFC, and embedded EWM, which runs inside the same SAP S/4HANA system as the ERP. From S/4HANA 1610 onwards, embedded EWM has been promoted as the strategic deployment, with the older WM module formally deprecated and a defined end-of-mainstream-maintenance roadmap. SAP also delivers EWM as a cloud edition under the wider RISE with SAP and SAP Cloud ERP umbrellas. EWM customers tend to be large global enterprises that run SAP for finance and manufacturing and want their warehouse execution layer to share master data and order data natively with the rest of the SAP estate. Implementation is typically led by major systems integrators such as Deloitte, Accenture, Westernacher, NTT Data Business Solutions, IBM and the SAP services arm itself.',
    flagshipProducts: [
      { name: 'SAP EWM (embedded in S/4HANA)', description: 'The strategic deployment for new SAP customers; EWM runs inside the same S/4HANA system as the ERP.' },
      { name: 'SAP EWM (decentral / standalone)', description: 'Runs on its own SAP NetWeaver system and integrates back to ERP, common in larger or multi-ERP environments.' },
      { name: 'SAP Yard Logistics', description: 'Add-on for yard management, often deployed alongside EWM.' },
      { name: 'SAP Transportation Management', description: 'TMS that integrates with EWM for inbound/outbound execution.' },
    ],
    typicalCustomerSize: 'Large enterprise (typically >$1B revenue) that already runs SAP ERP in the same business unit.',
    industries: ['Manufacturing', 'Automotive & Industrial', 'Pharma & Life Sciences', 'Consumer Goods', 'Wholesale Distribution', 'Retail'],
    knownCustomers: ['Bosch', 'BMW', 'Volkswagen Group', 'Henkel', 'BASF', 'Siemens', 'Colgate-Palmolive', 'Boehringer Ingelheim'],
    topicsToExplore: [
      'Experience with embedded EWM in S/4HANA vs decentral EWM on its own server',
      'Migrations from SAP WM (legacy module) to EWM',
      'Cross-functional projects involving EWM, MM, PP and SD modules',
      'Use of the EWM material flow system (MFS) for direct PLC-level control of automation',
      'ABAP / BAdI development experience for EWM customisations',
      'Programmes within RISE with SAP that include warehouse execution',
    ],
    furtherReading: [
      'SAP Help Portal — Extended Warehouse Management (help.sap.com)',
      'SAP Press EWM titles (e.g. "Warehouse Management with SAP EWM")',
      'SAP product roadmap documents for S/4HANA logistics',
    ],
  },

  {
    slug: 'd365-scm',
    name: 'Microsoft Dynamics 365 Supply Chain Management',
    shortName: 'D365 SCM',
    founded: 2016,
    hq: 'Redmond, Washington, USA',
    ownership: 'Public (NASDAQ: MSFT)',
    oneLiner: 'Microsoft\'s cloud ERP for supply chain, with embedded warehouse management evolved from the Dynamics AX WHS module.',
    history: 'Microsoft Dynamics 365 Supply Chain Management traces its lineage back to Axapta, an ERP product launched in Denmark in 1998, which Microsoft acquired through the Navision purchase in 2002 and rebranded as Dynamics AX. Advanced warehouse management capability was added to Dynamics AX in the AX 2012 R3 release as the WHS (warehouse) module, derived in part from technology from a Microsoft-acquired ISV. With the move to cloud-first delivery, Dynamics AX was rebranded Dynamics 365 for Finance and Operations in 2016 and subsequently split, in 2020, into separate Dynamics 365 Finance and Dynamics 365 Supply Chain Management products. WMS functionality lives within Dynamics 365 Supply Chain Management, with mobile execution delivered via the Warehouse Management mobile app on Android and iOS devices. Microsoft has continued to invest in the WMS capabilities, adding cloud and edge scale-out options, machine-learning-driven inventory and demand features, and Power Platform extensibility. D365 SCM customers typically already use Microsoft tools elsewhere — Office 365, Azure, Power BI, Power Automate — and value the native integration with that estate. Large implementations are typically delivered by partners such as DXC, Avanade, HSO, Hitachi Solutions, Sikich and Columbus.',
    flagshipProducts: [
      { name: 'Dynamics 365 Supply Chain Management — Warehouse Management', description: 'Cloud WMS module within the wider supply chain ERP product.' },
      { name: 'Warehouse Management mobile app', description: 'Configurable mobile UI for handheld and wearable devices.' },
      { name: 'Dynamics 365 Finance', description: 'The companion ERP financial product, often deployed together with SCM.' },
      { name: 'Power Platform (Power Apps, Power Automate)', description: 'Low-code extensibility used to bolt on warehouse-side workflows and integrations.' },
    ],
    typicalCustomerSize: 'Mid-market to large enterprise, particularly Microsoft-oriented IT estates.',
    industries: ['Manufacturing', 'Wholesale Distribution', 'Retail', 'Apparel & Lifestyle', 'Food & Beverage', 'Industrial'],
    knownCustomers: ['Chipotle Mexican Grill (corporate functions)', 'Coca-Cola Bottlers', 'Campari Group', 'Daimler Truck', 'Otis Elevator', 'Mahindra & Mahindra'],
    topicsToExplore: [
      'Experience implementing the Warehouse Management module within D365 SCM',
      'Migrations from Dynamics AX 2012 R3 WHS to D365 SCM cloud',
      'Use of the Warehouse mobile app — configuration vs custom UI extensions',
      'Integration patterns between D365 SCM, Power Platform and Azure services',
      'Hybrid deployments: cloud and edge scale units for warehouse continuity',
      'Combined Finance + Supply Chain implementations and the partner ecosystem',
    ],
    furtherReading: [
      'Microsoft Learn — Warehouse management overview (learn.microsoft.com)',
      'Dynamics 365 release notes and product roadmaps',
      'Partner case studies on microsoft.com/dynamics365',
    ],
  },

  {
    slug: 'oracle-wms-cloud',
    name: 'Oracle Warehouse Management Cloud',
    shortName: 'Oracle WMS Cloud',
    founded: 2003,
    hq: 'Austin, Texas, USA',
    ownership: 'Public (NYSE: ORCL)',
    oneLiner: 'Cloud-native WMS originally from LogFire, now sold by Oracle alongside Oracle Fusion Cloud SCM.',
    history: 'Oracle\'s cloud WMS originated as LogFire, founded in 2007 in Atlanta as one of the earliest pure-play cloud-native warehouse management products. Oracle acquired LogFire in 2016 and rebranded the product as Oracle Warehouse Management Cloud, slotting it into the wider Oracle Fusion Cloud SCM portfolio. Oracle continues to support the older on-premise Oracle Warehouse Management Enterprise Edition (often abbreviated WMS EE), which has roots in the 2003 PeopleSoft acquisition and earlier Oracle E-Business Suite logistics modules, but new sales and the strategic roadmap are squarely on the cloud product. Oracle WMS Cloud is multi-tenant SaaS, configurable for both retailers, manufacturers and 3PLs, with a particular foothold in 3PL operations because of its multi-customer billing capability. The product integrates with Oracle Fusion Cloud SCM, Oracle Transportation Management Cloud (OTM Cloud) and Oracle Order Management, and is also commonly run as a best-of-breed WMS alongside SAP, Microsoft or other ERPs. Oracle delivers the cloud product on Oracle Cloud Infrastructure, with regional data centres globally. Oracle is headquartered in Austin, Texas, having relocated from California in 2020.',
    flagshipProducts: [
      { name: 'Oracle Warehouse Management Cloud (ex-LogFire)', description: 'Cloud-native multi-tenant WMS; the strategic platform for new customers.' },
      { name: 'Oracle Warehouse Management Enterprise Edition (on-premise)', description: 'Older on-premise WMS still running at many existing Oracle customers.' },
      { name: 'Oracle Transportation Management Cloud (OTM)', description: 'Cloud TMS frequently sold and deployed alongside WMS Cloud.' },
      { name: 'Oracle Fusion Cloud SCM', description: 'The wider supply chain suite under which WMS Cloud is positioned.' },
    ],
    typicalCustomerSize: 'Broad — from mid-market 3PLs through to large global retailers and manufacturers.',
    industries: ['3PL', 'Retail', 'Wholesale Distribution', 'Manufacturing', 'Apparel & Lifestyle', 'Industrial'],
    knownCustomers: ['Land O\'Lakes', 'Saddle Creek Logistics', 'NFI Industries', 'GAP Inc.', 'Bridgestone', 'Bayer (selected sites)'],
    topicsToExplore: [
      'Experience with Oracle WMS Cloud (LogFire) vs the on-premise Oracle WMS EE',
      'Multi-tenant 3PL deployments and the WMS Cloud billing module',
      'Integrations with Oracle Fusion Cloud SCM, OTM and Order Management',
      'Best-of-breed deployments where Oracle WMS Cloud sits alongside non-Oracle ERPs',
      'Customer-side configuration approach: rule engine, screen / label tooling, no Oracle PaaS extensions',
      'Migrations from legacy on-prem Oracle WMS EE to the cloud product',
    ],
    furtherReading: [
      'Oracle Help Center — Warehouse Management Cloud documentation',
      'Oracle SCM cloud product pages (oracle.com/scm)',
      'Industry reports on cloud WMS adoption among 3PLs',
    ],
  },

  {
    slug: 'infor-wms',
    name: 'Infor WMS',
    shortName: 'Infor',
    founded: 2002,
    hq: 'New York, New York, USA',
    ownership: 'Subsidiary of Koch Industries (private).',
    oneLiner: 'Infor\'s warehouse management product, descended from the SSA Global / Provia Software lineage; cloud-delivered on AWS.',
    history: 'Infor was founded in 2002 and grew rapidly through acquisitions of established enterprise software vendors, including SSA Global, Lawson, Datastream and Geac. The WMS product line within Infor traces back to Provia Software\'s ViaWare WMS, acquired by SSA Global in 2005 and then folded into Infor when Infor acquired SSA Global in 2006. Infor consolidated several warehouse-related products over the years, with the current strategic offering branded Infor WMS, delivered as a cloud service on AWS as part of the wider Infor CloudSuite portfolio. Infor was taken private through an investment by Koch Industries in 2017, with Koch becoming sole owner in 2020. The vendor focuses on industry-specific CloudSuites — for example fashion, food & beverage, distribution, automotive and chemicals — and the WMS product is bundled into many of these vertical suites. Infor invests heavily in 3D visualisation tooling, labour management and parcel/network capabilities within the WMS, and has built up a strong install base in food & beverage, 3PL, distribution and apparel.',
    flagshipProducts: [
      { name: 'Infor WMS', description: 'Cloud-delivered WMS on AWS, the strategic execution product.' },
      { name: 'Infor CloudSuite (industry editions)', description: 'Vertical bundles for fashion, food, distribution, automotive, etc., with WMS included.' },
      { name: 'Infor Nexus', description: 'Network / supply-chain visibility platform sold alongside WMS.' },
      { name: 'Infor OS / Infor Coleman', description: 'Platform layer providing integration, AI and extensibility.' },
    ],
    typicalCustomerSize: 'Mid-market to enterprise (commonly $250M–$5B revenue).',
    industries: ['Food & Beverage', '3PL', 'Apparel & Lifestyle', 'Wholesale Distribution', 'Manufacturing', 'Automotive'],
    knownCustomers: ['Whirlpool', 'Boohoo Group (selected sites)', 'Triumph International', 'Alliance Healthcare', 'BAE Systems'],
    topicsToExplore: [
      'Experience with Infor WMS in the cloud AWS edition',
      'Industry-specific CloudSuite deployments where WMS is part of the bundle',
      'Migrations from older Infor / SSA / Provia warehouse products',
      'Use of Infor OS for integration and Infor Coleman for AI features',
      '3PL deployments on Infor WMS and the network / billing capabilities',
      'Labour management and 3D-visualisation tooling at Infor sites',
    ],
    furtherReading: [
      'Infor product portal (infor.com)',
      'Infor CloudSuite documentation per industry',
      'Public customer case studies on infor.com',
    ],
  },

  {
    slug: 'tecsys-elite',
    name: 'Tecsys Elite',
    shortName: 'Tecsys',
    founded: 1983,
    hq: 'Montréal, Québec, Canada',
    ownership: 'Public (TSX: TCS)',
    oneLiner: 'Canadian supply chain software vendor; particularly well-known in healthcare, hospital systems and complex distribution.',
    history: 'Tecsys was founded in 1983 in Montréal as a supply chain management software vendor and listed on the Toronto Stock Exchange in 2000 (TSX: TCS). The company\'s flagship platform is Elite, which encompasses warehouse management, distribution management, transportation management, healthcare-specific supply chain modules, and a unified order and fulfilment layer. Tecsys has historically been particularly strong in the North American healthcare and hospital supply chain segment, where its products manage clinical inventory, point-of-use replenishment, OR pick-lists and consolidated service centres for hospital networks. In parallel, the WMS is deployed across complex distributors, 3PLs, and consumer goods companies. The product is offered both on-premise and as a cloud service, with the cloud product extending into the Tecsys Streamline and Tecsys Omni platforms for order, fulfilment and pharmacy distribution. Tecsys is publicly traded on the TSX, with revenue in the low hundreds of millions of Canadian dollars.',
    flagshipProducts: [
      { name: 'Tecsys Elite Warehouse Management', description: 'Core WMS module within the Elite platform.' },
      { name: 'Tecsys Elite Distribution Management', description: 'Distribution / order management functionality often used together with the WMS.' },
      { name: 'Tecsys Healthcare Supply Chain', description: 'Hospital-specific point-of-use, clinical replenishment and consolidated service centre tooling.' },
      { name: 'Tecsys Omni / Streamline', description: 'Unified order and fulfilment platform layer extending the WMS into commerce.' },
    ],
    typicalCustomerSize: 'Mid-market to enterprise, with a particular strength in large hospital systems and complex distributors.',
    industries: ['Healthcare', 'Pharma & Life Sciences', '3PL', 'Wholesale Distribution', 'Industrial'],
    knownCustomers: ['Mass General Brigham', 'St. Joseph\'s Health', 'Yale New Haven Health', 'University of Minnesota Health', 'Penske Logistics (selected sites)'],
    topicsToExplore: [
      'Experience with Tecsys Elite in hospital / healthcare consolidated service centres',
      'WMS deployments outside healthcare — 3PL, distribution, retail',
      'Use of Tecsys Streamline / Omni for unified order management',
      'Cloud vs on-premise deployment patterns at Tecsys customers',
      'Integration with Epic, Cerner / Oracle Health and other clinical systems',
      'Programmes that combine Elite WMS with point-of-use clinical replenishment',
    ],
    furtherReading: [
      'Tecsys investor relations (tecsys.com/investors)',
      'Tecsys healthcare supply chain solution pages',
      'TSX-listed company filings (sedarplus.ca)',
    ],
  },

  {
    slug: 'mecalux-easy-wms',
    name: 'Mecalux Easy WMS',
    shortName: 'Mecalux',
    founded: 1966,
    hq: 'Barcelona, Spain',
    ownership: 'Privately held (Mecalux S.A.).',
    oneLiner: 'Spanish racking, automation and software vendor; Easy WMS is the warehouse management software bundled with Mecalux automation.',
    history: 'Mecalux was founded in 1966 in Barcelona as a racking and storage equipment manufacturer. Over the following decades it grew into one of the largest racking and automated storage system providers in Europe, with manufacturing plants in Spain, Poland, the United States, Brazil and Mexico, and a global installed base of pallet racking, miniload AS/RS, pallet shuttle systems and automated warehouses. Easy WMS is Mecalux\'s warehouse management software, originally developed to manage Mecalux automation and now sold both bundled with Mecalux equipment and as a standalone product running on third-party warehouses. The software is delivered both on-premise and as a SaaS cloud service, and is positioned as a configurable, lower-friction WMS for small and mid-sized warehouses as well as larger automated facilities. Mecalux also sells a Galileo control system layer (WCS) that drives its physical automation, and a "Mecalux Software Solutions" division that packages WMS, WCS and supply chain analytics. As a privately held, founder-controlled business Mecalux does not publish detailed financials, but is widely reported in industry coverage to have annual revenues approaching €1B.',
    flagshipProducts: [
      { name: 'Easy WMS', description: 'The core warehouse management product; modular and offered on-prem or as SaaS.' },
      { name: 'Galileo Control System (WCS)', description: 'Warehouse control system that drives Mecalux automated equipment.' },
      { name: 'Mecalux Supply Chain Analytics', description: 'Reporting and analytics layer over Easy WMS.' },
      { name: 'Mecalux automation (AS/RS, pallet shuttle, miniload)', description: 'The hardware portfolio that Easy WMS is most often paired with.' },
    ],
    typicalCustomerSize: 'Small to mid-market warehouses; some larger automated sites where Easy WMS sits over Mecalux equipment.',
    industries: ['Manufacturing', 'Wholesale Distribution', '3PL', 'Food & Beverage', 'Retail'],
    knownCustomers: ['Decathlon (selected DCs)', 'Würth (selected sites)', 'Michelin (selected sites)', 'Disney (selected sites)', 'Hayat Kimya'],
    topicsToExplore: [
      'Experience implementing Easy WMS standalone vs alongside Mecalux automation',
      'Integration of Easy WMS with the Galileo WCS and AS/RS / pallet shuttle hardware',
      'SaaS Easy WMS deployments vs on-premise',
      'Use of Easy WMS in light manufacturing and small DC environments',
      'Approach to extensibility: configuration vs the Mecalux Software Solutions services team',
      'Combined hardware + software programmes from Mecalux',
    ],
    furtherReading: [
      'Mecalux corporate site (mecalux.com)',
      'Easy WMS product documentation on mecalux.com',
      'Industry coverage of Mecalux automated warehouse projects',
    ],
  },
]
