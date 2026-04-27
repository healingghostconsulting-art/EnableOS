# Telephony Plugin Research Notes

## Official marketplace observations

### Genesys AppFoundry

The official Genesys marketplace presents integrations as catalog-listed applications and partner solutions under **Genesys AppFoundry**. The site exposes category filtering and explicit partner onboarding links such as **Join AppFoundry**, **Developer Partner Guide**, and **Developer Center Documentation**. This suggests that EnableOS could likely be packaged as a marketplace-listed partner integration rather than only a loose external API connector.

### Talkdesk AppConnect

The official Talkdesk marketplace describes itself as **the first enterprise app store** and separates listings between **Apps and Solutions** and **Integrations**. Its category system explicitly includes **Workforce Engagement**, **Agent Coaching & Performance**, **Learning Management**, **Quality Management**, and **Workforce Management**, which is directly relevant to an EnableOS positioning. This strongly suggests that CHCG EnableOS could be framed on Talkdesk as either an agent-performance/coaching app, a learning-management extension, or a mixed coaching-plus-workforce-enablement integration.

### Zoom Contact Center apps

The official Zoom developer documentation for **Contact Center apps** confirms that Zoom has a dedicated app model for contact-center contexts, although the specific article content did not fully render in-browser during this pass. Even so, the dedicated developer-doc path strongly indicates that Zoom Contact Center supports its own in-product app surface rather than only generic external APIs.

### Cisco Webex Contact Center

The official Webex developer overview describes Webex Customer Experience as an **open platform** with REST, GraphQL, and gRPC APIs, plus **Custom Desktop** and **Integrations** capabilities. It explicitly states that third-party integrations can invoke CX APIs on behalf of another CX user through temporary access tokens and can be used in the CX portal by widening scope. This suggests that EnableOS could likely be packaged for Webex as both an embedded desktop experience and an external integration service tied to user-authorized API access.

### Five9

The official Five9 page states that its **APIs and SDKs** support advanced software integrations and highlights REST access for agents, administrators, supervisors, and reporting users. Five9 also explicitly references a **partner app marketplace with over 55 partner solutions**. The page lists CTI web services, configuration, reporting, statistics, CRM SDK, and web connectors, which suggests EnableOS could likely enter Five9 first as an integration-led product, with marketplace distribution as a second step.

### Aircall

The official Aircall developer portal strongly supports an app strategy. It explicitly says developers can **build and distribute apps to thousands of companies worldwide through the Aircall App Marketplace**. It also emphasizes APIs, webhooks, OAuth, and **Insight Cards** for showing external information directly inside the phone experience during calls. That makes Aircall one of the strongest candidates for an EnableOS coaching and in-call guidance integration, because it appears to support both post-call automation and real-time in-call contextual surfaces.

### NICE CXone Mpower

The official NICE developer community says developers can **customize integrations and applications for the CXone Mpower platform** using **hundreds of APIs and SDKs**. It also says NICE has an **open framework**, common data layer, and hubs to **run third-party apps natively**, while the **DEVone Ecosystem** and **Become a DEVone Partner** links indicate a formal partner route. This makes NICE a strong target for a deeper embedded integration rather than only a reporting sync.

### RingCentral

The official RingCentral developer portal emphasizes **APIs, SDKs, widgets, and developer tools**, plus an **App Gallery** and **over 500 ready-to-use integrations**. It also exposes product-specific API surfaces including **RingCX** and **Contact Center**. For EnableOS, this suggests two realistic options: a broader RingCentral app-galley integration focused on communications data and workflow triggers, or a more targeted RingCX/contact-center integration if the team wants tighter agent and supervisor workflow alignment.

### Dialpad

The official Dialpad developer page says teams can **customize Dialpad Connect, Sell, and Support experiences** with APIs covering **voice, SMS, user management, analytics, and contact center** capabilities. It also references **OAuth access** and an **App Marketplace Submission Form**, which indicates a real partner-distribution path rather than API-only integration. For EnableOS, Dialpad looks attractive for both embedded workflow extensions and post-call coaching or analytics integrations.

### 8x8

The official 8x8 developer portal page reviewed here is more integration-directory oriented than app-store oriented. It highlights an **integrations overview** across customer support, workflow automation, identity, logistics, and marketing tools, with entries such as Salesforce, Zendesk, Freshdesk, Zapier, Workato, and Okta. This suggests 8x8 is currently better approached as a **connector/integration ecosystem** rather than a deeply embedded app marketplace, which may make EnableOS more suitable as an event-driven workflow or CRM-adjacent integration first.

### Twilio Flex

The official Twilio Flex page describes Flex as a **flexible contact center** that can **embed voice, messaging, and AI into existing apps**. It emphasizes a **programmable foundation**, composable architecture, and customization and deployment paths. For EnableOS, Twilio Flex stands out as one of the best technical fits for a deeply embedded coaching and workflow experience because Twilio explicitly positions Flex as something customers and partners can extend rather than only integrate around.

### Salesforce Service Cloud Voice

An attempted navigation to a Salesforce developer documentation URL for Service Cloud Voice returned a **404 page**, so I still need a better official source for Salesforce's current voice extensibility model before including it confidently in the final ranked shortlist. At this stage, Salesforce remains a likely ecosystem candidate, but not yet one of the better-confirmed plugin targets in this research pass.

### Salesforce Service Cloud Voice

The official Salesforce **Service Cloud Voice for Partner Telephony Developer Guide** confirms that telephony providers can create a solution that integrates their telephony system with Service Cloud Voice by building a **connector and package for customers**. The guide references publishing a partner telephony package, connecting the telephony system to Salesforce, authentication, call actions, routing, transfers, and a Service Cloud Connector API. For EnableOS, Salesforce is less a standalone telephony target and more a **strategic overlay ecosystem** where EnableOS could integrate alongside telephony and CRM workflows.

### Vonage

The official Vonage Developer Center is clearly API-first. It highlights **communication and network APIs**, pre-built projects, voice APIs, messaging, video, and low-code tooling. That makes Vonage a good fit for **programmable integrations** and workflow automation, but based on the source reviewed here it appears less like a classic contact-center app marketplace and more like a platform for custom communications products. For EnableOS, Vonage would likely be a custom integration target rather than a packaged contact-center marketplace plugin.

### NICE CXone

The search results confirm an official **NICE Developer Community** positioned around tools and resources to customize integrations and applications for the **CXone Mpower** platform. NICE also shows multiple official integration surfaces around Amazon Connect, virtual agents, workforce optimization, and analytics. That points to NICE as a serious enterprise target for EnableOS, likely through a mix of **platform customization, workflow integration, and partner solution positioning** rather than a lightweight widget alone.

### Amazon Connect

An attempt to open Amazon's official partner-solutions page in-browser was blocked by site access restrictions in this environment. However, the official result located via search is **Amazon Connect Partner Solutions** on AWS Marketplace, which indicates Amazon Connect supports a formal **partner-solution and marketplace model** in addition to its API-driven platform approach. I still want one more accessible primary source or documentation page before finalizing Amazon's ranking, but it already looks like a viable target for EnableOS via partner-solution packaging and workflow integration.

### Zoom partner go-to-market path

The official Zoom **Developer Partner Program** page states that Zoom developer partner services can help build and bring a **Video SDK, Meeting SDK, or Zoom Integration** to market faster, and it offers a formal partner-contact path. Combined with the separate official Zoom Contact Center apps documentation already reviewed, this suggests Zoom offers both a **technical app model** and a **partner commercialization path**. For EnableOS, that makes Zoom more credible as a true plugin target rather than just an API integration target.

### Genesys AppFoundry go-to-market path

Official Genesys sources indicate that AppFoundry is not just a discovery page but a structured marketplace program. Genesys states that AppFoundry connects partner solutions with a global audience, and Genesys help content indicates partners apply through the **Genesys Ascend Partner Portal**, sign an **AppFoundry Partner Master Agreement**, and go through partner onboarding steps. This strengthens the case for Genesys as a realistic **marketplace distribution** target for EnableOS, not merely an integration target.

### Talkdesk go-to-market path

Official Talkdesk sources reinforce that AppConnect is intended as an **enterprise app store**, while the Talkdesk developer platform explicitly invites teams to create apps and custom integrations on the Talkdesk contact center platform. Even though I still want a cleaner public source on submission specifics, the available official evidence already supports Talkdesk as one of the most realistic **packaged app** targets for EnableOS.
