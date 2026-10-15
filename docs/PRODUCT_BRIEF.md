# PolyConnect Product Brief

**Status:** Phase 0 proposal — requires founder review  
**Initial market:** Nigeria  
**Pilot campus:** Federal Polytechnic Oko, Anambra State  
**Initial monetization:** Free during closed beta  
**Budget constraint:** ₦0/month initially; Firebase Spark and free tiers only  
**Operating model:** Solo founder using GitHub and AI-assisted development

## Product vision
PolyConnect is an adults-only dating and connection product for polytechnic students, starting with a controlled pilot at Federal Polytechnic Oko. It should help adults discover compatible people and build respectful connections through a safer, campus-aware experience—not merely provide an endless swipe feed.

## Target users
- Adults aged 18 and older who attend or identify with a participating polytechnic.
- Students using personal email addresses; a school email address is not required.
- People seeking dating, relationships, friendship or campus social connections, with clear user-controlled intent.
- Initial pilot participants at Federal Polytechnic Oko, followed by other Nigerian polytechnics only after safety and reliability gates pass.

Student affiliation is self-declared and must not be presented as independently verified. A verification badge must be reserved for a clearly described, completed photo/liveness verification process; it must never be granted just for uploading a selfie or checking a box.

## User value proposition
PolyConnect helps adult students discover compatible people in a campus-aware community, understand shared interests and relationship intentions, and connect with tools for consent, reporting and blocking.

## Differentiators to test
These are hypotheses, not proven advantages over competitors:
1. **Polytechnic-first community:** campus-aware discovery and relevant events rather than a generic city-wide dating pool.
2. **Intent and interest prompts:** encourage meaningful conversations around goals, interests, courses and campus life.
3. **Curated daily suggestions:** a manageable set of compatible profiles rather than endless swiping.
4. **Safety visibility:** straightforward reporting and blocking, clear account controls, and transparent verification states.
5. **Low-data mobile experience:** a mobile-first UI designed for common Android devices and constrained connectivity.

Tinder, Hinge and Bumble are established products with much larger network effects and mature operations. PolyConnect should not claim to be safer or more effective until measurable evidence supports that claim.

## MVP scope
### Required before any public growth
- Hard 18+ access gate, enforced in application flows and backend authorization.
- Email/password signup using personal email, with email verification required before activation.
- No plaintext password storage in localStorage or any demo persistence.
- Server-enforced authorization and validated Firestore data access.
- Backend-backed reporting and blocking, moderation workflow, abuse limits and an operational escalation process.
- Privacy notice, terms, retention policy and real deletion of account-associated backend data.
- Camera permission UX that works on Android; verification status that cannot be self-assigned.
- Local demo mode clearly separated from real accounts and never represented as production-backed.

### Core product after safety gates
- Real multi-user profile discovery and mutual matches.
- Secure real-time chat and controlled image uploads.
- Push notifications only after consent and platform configuration.
- Daily curated recommendations, campus events and interest prompts.

### Explicit non-goals for the first pilot
- Paid subscriptions, ads or other monetization.
- Broad national launch before pilot evidence.
- Claims of identity verification without a defined and tested verification process.
- Paid infrastructure or third-party vendors without founder approval.

## Success metrics
Measure safety and quality as well as growth. Establish baselines during the closed beta.
- **Activation:** share of signups that verify email and complete a profile.
- **Onboarding reliability:** successful signup, login and profile-save rates; track errors without collecting unnecessary personal data.
- **Meaningful connection:** mutual matches and conversations initiated by both parties, not raw swipe counts.
- **Retention:** day-7 and day-30 return rates, interpreted alongside safety reports.
- **Safety response:** time to triage reports, time to action on urgent reports, repeat-abuse rate and appeal outcomes.
- **User control:** successful block, report and deletion flows.
- **Reliability:** crash/error rate, failed requests and Android camera-permission success.
- **Cost:** monthly service usage against free-tier quotas and forecasted cost before enabling growth.

Do not optimize growth at the expense of safety or encourage engagement loops that pressure users into unwanted interactions.

## Pilot plan
1. Complete safety and privacy review before inviting participants.
2. Run a small, invitation-only test with consenting adults at Federal Polytechnic Oko.
3. Test signup, email verification, profile creation, camera permission, reporting, blocking and deletion on real Android devices.
4. Operate a documented moderation and incident-response process.
5. Review reliability, safety reports and user feedback before inviting more campuses.

## Legal and operational review required
Obtain qualified Nigerian legal/privacy advice on applicable data-protection obligations, lawful basis and consent, retention/deletion, cross-border processing, age assurance, user-generated content, moderation, incident handling and dating-app platform policies. The founder must also decide who can access moderation data and how urgent reports are handled. This document is a product proposal, not legal advice.
