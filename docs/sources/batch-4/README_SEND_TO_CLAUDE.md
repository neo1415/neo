# TALENT Q | Exactly what to send to Claude

This pack was updated **27 October 2026**. It *extends* the original research design pack without deleting its 146 screens, 41 animations or 32 founder requirement groups.

## 1. For Claude Code (recommended for source-controlled design + videos)

1. Create a clean Talent Q design workspace/repository (not a new copy of Capital Q).
2. Upload/extract **Talent_Q_Expanded_Design_Pack_v2.zip** in the workspace, and copy **talentq-film.mp4** beside the pack (the film is distributed separately to avoid a large archive).
3. Add the previous Talent Q investor/product brief, technical blueprint, global market research, and journey atlas. Copies are included in `reference_docs/` in this ZIP.
4. Give Claude Code the full text of **`00_CLAUDE_START_HERE_v2.md`** as its first instruction, or say: "Read and execute `00_CLAUDE_START_HERE_v2.md` as the controlling task. All referenced files are in this workspace. Begin with design audit and working code prototype. Do not change Capital Q without permission." Use that **instead of** the older `05_CLAUDE_DESIGN_FIRST_MASTER_DIRECTIVE.md`.
5. Provide the authorized GitHub repository **https://github.com/neo1415/q** for read-only architecture inspection, using the latest shared handoff to identify the real active branch. Existing code must not be changed without permission.
6. Have Claude produce a **runnable React design prototype**, screen coverage, motion contracts, screenshot evidence and **actual** recorded video captures. Check in the prototype and assets. Claude Artifacts/Design can accompany it as previews; paid Figma is unnecessary.

## 2. For Claude web/desktop Artifacts (if Claude Code is unavailable)

Upload the ZIP or extracted files, the film, and `00_CLAUDE_START_HERE_v2.md`. Ask Claude to use its **Design** output/template for the visual exploration and **interactive Artifacts** for individual journeys. Do not expect one Claude web artifact to become a production application repository with every route, calendar integration and durable memory system. Transfer approved concepts to Claude Code or a coding environment to establish a source-controlled React implementation.

## 3. What the updated pack contains

- `00_CLAUDE_START_HERE_v2.md`: **ONE controlling prompt** for Claude; replaces old directive when in conflict.
- `08_ADDENDUM_SCHEDULING_J7_MEMORY_AND_TOOLING.md`: researched product, workflow, technical, trust and UI requirements for all new concerns.
- `Talent_Q_Vision_Addendum_v2.pdf`: a readable PDF copy of the addendum.
- `02_COMPLETE_SCREEN_ATLAS_v2.csv`: **183** screen concepts, preserving original 146.
- `03_MOTION_AND_VIDEO_ATLAS_v2.csv`: **57** motion requirements, preserving original 41.
- `04_FOUNDER_VISION_TRACEABILITY_v2.csv`: **41** founder capability groups, preserving original 32.
- `01_*`, `02_*` (original), `03_*` (original), `04_*` (original), `05_*` (legacy), `06_*`, `07_*`: all key original research/design files preserved as historical source.
- `reference_docs/`: product/market/technical/journey sources for contextual research. Never substitute a prior investor forecast for a tested software requirement.

## 4. Priority acceptance samples

An external reviewer should be able to use these prototype flows without narration:

1. Q remembers a recruiter interview preference and applies it to a **new** scheduled call without leaking the organizer's private calendar events.
2. Q proposes candidate slots in the candidates' local time, rechecks availability on acceptance, obtains a provider confirmation (or simulated provider receipt clearly labeled as such) and shows a truthful confirmed booking.
3. Candidate can counterpropose, reschedule, change contact channel or opt out; recruiter sees one coherent interview/pipeline record.
4. A graduate or career switcher uses J7 as a real career-development experience: role path, evidence gaps, practice, feedback, progress and permission-controlled publication of new work.
5. Q explains a remembered fact with its source, accepts correction, and stops revealing a revoked fact after permission changes.
6. Q's working app can present comparison tables, evidence previews, adaptive interviews and purposeful motion, with forms/text alternatives and visible error/offline states.

## 5. What is not claimed

This is a *researched design and execution specification*, not an implemented Talent Q backend or proof of provider eligibility. Real calendar calls, WhatsApp messaging/calling, paid model use, applicant data and autonomous outbound communication need separate credentials, approvals, contracts, testing and provider eligibility checks.

## Critical sources used for this addendum

- https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://learn.microsoft.com/en-us/graph/outlook-get-free-busy-schedule
- https://learn.microsoft.com/en-us/graph/api/user-findmeetingtimes?view=graph-rest-1.0
- https://www.twilio.com/docs/voice/whatsapp-business-calling
- https://docs.langchain.com/oss/javascript/langgraph/persistence
- https://obsidian.md/help/plugins/graph
- https://github.com/Graphify-Labs/graphify
- https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them
- https://help.figma.com/hc/en-us/articles/39216419318551-Get-started-with-the-Figma-MCP-server
- https://help.figma.com/hc/en-us/articles/39252411778583-Figma-MCP-server-FAQs
- https://www.nature.com/articles/s44159-022-00089-1
