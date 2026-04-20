# CHCG Training Content Inventory

## Purpose

This working document captures the reusable learning patterns, workflow concepts, leadership behaviors, and client-specific references identified in the uploaded PowerPoint decks. It is intended to guide the sanitization and remapping of that material into CHCG EnableOS without carrying forward client-identifying content.

## Uploaded Decks Reviewed So Far

| File | Module Type | Reusable Themes | Client-Specific Elements To Remove |
| --- | --- | --- | --- |
| `AgentTraining1SoftSkills&CustomerServiceFoundations.ASWMC.pptx` | Agent | service mindset, communication, empathy, de-escalation, professionalism, trust building, QA coaching forms, scenario quizzes | repeated use of patient-specific framing, APS references, Genesis APS QA form naming, healthcare-specific terminology where not essential |
| `WMCHealth_QA&WorkflowTrainingFinal.pptx` | Agent | telephony workspace, status management, ACW discipline, warm transfers, identity verification, workflow accuracy, QA score logic, adherence, supervisor monitoring, 1:1 coaching workflow | WMCHealth branding, Cerner references, Genesys Cloud screenshots/naming where branded too specifically, patient/provider/location details, healthcare network language, slogans |
| `LeadershipModule1-UnlockingthePowerofData.pptx` | Leadership | KPI literacy, trend interpretation, root cause analysis, action planning, analysis bias avoidance, dashboard use, leadership reflection | patient-specific wording, contact-center healthcare framing where overly client-specific |
| `Module3-UtilizingPerformancetoMaximizePerformanceV111.20.25.pptx` | Leadership | performance bucketing, calibration, coaching the movable middle, PIPs, progressive discipline, adherence coaching, leadership rituals, feedback loops | placeholder client QA form reference, organization-specific process assumptions if retained literally |

## Cross-Deck Learning Patterns

The decks consistently reinforce several strong CHCG-ready themes. First, frontline enablement is framed around **communication quality**, **empathy**, **professionalism**, **workflow accuracy**, and **calm de-escalation under pressure**. Second, leadership development is framed around **KPI fluency**, **pattern recognition**, **fair calibration**, **structured coaching**, and **disciplined follow-through**. Third, both agent and leadership material emphasize that performance improvement depends on a closed loop between **signals, coaching, action plans, and documentation**.

These patterns fit the existing EnableOS concept well because the platform already contains KPI signals, interventions, documentation evidence, review logs, and role-based workspaces. The upgraded demo should therefore use the uploaded modules not as isolated slides, but as the backbone for deeper learning journeys, coaching prompts, intervention rules, and methodology assets.

## Sanitization Guidance

All explicit client names, logos, slogans, facility references, patient/provider examples, organization-specific forms, and proprietary workflow labels should be removed or generalized. Healthcare-specific training ideas can still be preserved where they represent broadly applicable service and workflow principles, but the visible wording in the demo should be converted into neutral enterprise enablement language or CHCG-branded methodology language.

## Initial Mapping Direction

| Source Theme | EnableOS Destination |
| --- | --- |
| Communication, empathy, de-escalation, professionalism | Agent learning journey modules and microlearning cards |
| QA score categories, workflow accuracy, adherence, call handling | KPI signal rules, intervention triggers, coaching scorecards |
| KPI literacy and trend interpretation | Executive and manager dashboards, data interpretation playbooks |
| Performance buckets, calibration, PIPs, 1:1 coaching workflow | Leadership journey, coaching log templates, manager playbooks, documentation hub |
| Reflection prompts and activities | AI coaching suggestions, manager prep prompts, executive review guidance |

## Additional Deck Findings

The **QA Essentials** deck contributes a clean, reusable structure for quality scoring and coaching. Its strongest reusable elements are the nine QA scoring categories, the distinction between formal and insight-only reviews, the concept of auto-fails for critical failures, guidance for reviewing scores constructively, and calibration as a fairness mechanism. These ideas can be mapped directly into the EnableOS quality scorecards, intervention logic, manager coaching prep, and learner-facing improvement guidance.

The **Performance Management** deck adds a leadership operating model that is especially valuable for EnableOS. The strongest reusable elements are the three performance buckets, bias-avoidance guidance, calibration practices, discovery tools, high-performer development, coaching for the movable middle, structured low-performance intervention, PIP building blocks, adherence coaching, and daily leadership rituals. These concepts should strengthen the manager and executive workspaces by making coaching recommendations more structured and operationally credible.

The **Gamification for Remote Teams** deck adds a useful engagement layer that can make the demo more distinctive. The most relevant concepts are recognition loops, points and badges, challenge design, balancing competition and collaboration, reward design, engagement measurement, pulse checks, weekly recognition cycles, daily operating rhythms, and continuous iteration. These ideas can be adapted into EnableOS as optional engagement overlays rather than core compliance tooling, which keeps the platform polished and enterprise-credible while showing a more modern leadership toolkit.

## Explicit Sanitization Targets In Current Demo

A quick scan of the current demo code confirms that client-specific content still exists inside the seeded data and tests. The most visible examples include tenant names such as **Northstar Health Access**, **Summit Financial Care**, and **Velocity Retail Support**, along with tenant-scoped persona names and branded workspace labels. These will need to be replaced with neutral CHCG-branded demo tenants and generalized role examples before delivery.

The uploaded source decks also contain repeated references that must not survive into the sanitized demo. Those include branded healthcare systems, branded greetings and closings, patient/provider/facility wording, Cerner-specific workflow references, Genesis APS naming, and slogans tied to specific organizations. The CHCG-owned copyright footer in the gamification deck may be retained where appropriate because it is CHCG material, but customer-identifying examples and logos should be removed or generalized.

## Recommended Sanitized Content Families For EnableOS

| New EnableOS Family | Derived From | Purpose in Demo |
| --- | --- | --- |
| Service Foundations | soft skills, empathy, professionalism, de-escalation decks | frontline learner journeys and intervention modules |
| Workflow Precision | QA workflow, identity verification, hold, transfer, documentation, ACW discipline | KPI-triggered remediation and manager coaching playbooks |
| Data-Led Leadership | KPI literacy, trend reading, root cause analysis, dashboard usage | executive insights, manager coaching prep, ROI narratives |
| Performance Leadership | bucketing, calibration, PIPs, weekly coaching cadence, leadership rituals | manager/admin coaching workflows and review logs |
| Engagement & Recognition | gamification, peer recognition, pulse checks, daily rhythm, reward design | optional culture and motivation layer for remote-team enablement |
