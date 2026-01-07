# SignalCraft: Codebase Analysis & Execution Plan

**Document Version:** 1.0  
**Date:** January 7, 2026  
**Author:** Development Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Feature Inventory](#feature-inventory)
4. [Gap Analysis](#gap-analysis)
5. [Technical Debt](#technical-debt)
6. [Execution Plan](#execution-plan)
7. [Risk Assessment](#risk-assessment)

---

## Executive Summary

SignalCraft is an **intelligent alert management platform** designed to help engineering teams reduce alert fatigue, improve incident response times, and gain actionable insights from their monitoring data.

### Core Value Proposition

| Pain Point | SignalCraft Solution |
|------------|---------------------|
| Alert fatigue from duplicate errors | Intelligent deduplication by fingerprint |
| Missed critical alerts | Slack notifications with auto-escalation |
| Wrong teams getting alerts | Rules-based routing engine |
| No debugging context | AI suggestions + resolution memory |
| Hard to track patterns | Anomaly detection + analytics |

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 14 (App Router) • React • TypeScript • Tailwind    │
│  Clerk Auth • Radix UI Components                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API                                  │
│  NestJS • Prisma ORM • PostgreSQL • BullMQ (Redis)          │
│  Slack Web API • OpenRouter AI                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      INTEGRATIONS                            │
│  Sentry (Webhooks) • Slack (OAuth + Interactive)            │
│  Planned: PagerDuty, Opsgenie, Email                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

### Monorepo Structure

```
SignalCraft/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   └── src/
│   │       ├── alerts/         # Core alert processing
│   │       ├── ai/             # AI suggestions & postmortems
│   │       ├── auth/           # Clerk authentication
│   │       ├── escalations/    # BullMQ escalation jobs
│   │       ├── integrations/   # Slack, Sentry
│   │       ├── notifications/  # Slack message builders
│   │       ├── releases/       # Release tracking
│   │       ├── routing/        # Rules engine
│   │       ├── session-replay/ # rrweb replay storage
│   │       ├── uptime/         # Endpoint monitoring
│   │       └── webhooks/       # Sentry webhook handler
│   │
│   └── web/                    # Next.js Frontend
│       └── app/
│           ├── dashboard/      # Main application
│           ├── api/            # API route proxies
│           └── (auth)/         # Auth pages
│
└── packages/
    ├── database/               # Prisma schema + client
    └── shared/                 # Shared TypeScript types
```

### Data Flow

```
Sentry Error → Webhook → AlertProcessor → Deduplication → RoutingEngine
                                                              │
                              ┌────────────────────────────────┘
                              ▼
                     SlackNotification → Message with Actions
                              │
                              ▼ (if not ACK'd)
                     EscalationQueue → Escalation Notification
```

---

## Feature Inventory

### ✅ Fully Implemented & Working

#### Alert Management
| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Sentry webhook ingestion | ✅ | N/A | POST `/webhooks/sentry` |
| Alert deduplication | ✅ | N/A | By fingerprint/groupKey |
| Alert list view | ✅ | ✅ | `/dashboard/alerts` |
| Alert detail view | ✅ | ✅ | `/dashboard/alerts/[id]` |
| Acknowledge/Resolve/Snooze | ✅ | ✅ | From UI + Slack |
| Severity levels | ✅ | ✅ | Critical/High/Medium/Low/Info |
| Resolution notes | ✅ | ✅ | Stored for future reference |

#### Slack Integration
| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| OAuth installation | ✅ | ✅ | `/dashboard/integrations` |
| Rich notifications | ✅ | N/A | Slack Block Kit |
| Interactive buttons | ✅ | N/A | Action handler |
| Escalations | ✅ | N/A | BullMQ queue with delays |
| Channel selection | ✅ | ✅ | In routing rules |

#### Routing Rules
| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Condition builder | ✅ | ✅ | Nested AND/OR logic |
| Action configuration | ✅ | ✅ | Channel, mentions, escalation |
| Priority ordering | ✅ | ✅ | Drag-to-reorder |
| Enable/disable | ✅ | ✅ | Toggle per rule |
| Rule validation | ✅ | ✅ | Validates conditions + actions |

#### AI Features
| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Fix suggestions | ✅ | ✅ | OpenRouter API |
| Postmortem generation | ✅ | ✅ | For resolved alerts |
| Correlated alerts | ✅ | ✅ | Time-based correlation |

#### Sentry-Inspired Features (Recently Added)
| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| Release tracking | ✅ | ✅ | Health widget on dashboard |
| Breadcrumbs | ✅ | ✅ | Timeline on alert detail |
| Anomaly detection | ✅ | ✅ | Spike detection widget |
| Uptime monitoring | ✅ | ✅ | Scheduled checks, status widget |
| Session replay | ✅ | ✅ | Player UI (rrweb pending) |

---

### ✅ Implemented and NOW Connected (Fixed)

| Feature | What Was Missing | What Was Done | Status |
|---------|------------------|---------------|--------|
| **Hygiene Controller** | Hardcoded `demo-workspace` | Added `@WorkspaceId()` decorator | ✅ Fixed |
| **Uptime Notifications** | No Slack on status change | Added `sendStatusChangeNotification()` | ✅ Fixed |
| **Breadcrumb Ingestion** | Webhook didn't parse | Added `extractAndSaveBreadcrumbs()` | ✅ Fixed |
| **Correlation Rules** | No UI for CRUD | Created API + page at `/dashboard/correlations` | ✅ Fixed |
| **Notification Logs** | No page to view | Created page at `/dashboard/notification-logs` | ✅ Fixed |
| **Dashboard Analytics** | Used fake data | Created `/api/dashboard/analytics` endpoint | ✅ Fixed |

### ⚠️ Remaining Items
| **Session Replay Recording** | No rrweb SDK, no R2 storage | Needs client SDK + external storage | 🟡 Medium |

---

### 🚫 Missing Features

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Email Notifications** | SendGrid/SES for on-call | High | 2-3 days |
| **PagerDuty Integration** | Enterprise on-call tool | Medium | 3-5 days |
| **Opsgenie Integration** | Alternative on-call tool | Medium | 3-5 days |
| **Webhook Actions** | Route to custom URLs | High | 1 day |
| **API Key Management** | Programmatic access | High | 1-2 days |
| **Team Management UI** | CRUD for team members | Medium | 1-2 days |
| **Audit Logging** | Track who did what | Medium | 2-3 days |
| **Multi-tenancy** | Isolated workspaces | Low | 1 week |
| **Mobile App** | On-call alerts | Low | 2+ weeks |

---

## Gap Analysis

### Critical Gaps (Must Fix)

#### 1. Hygiene Controller Not Working
**File:** `apps/api/src/alerts/hygiene/hygiene.controller.ts`

**Problem:**
```typescript
const workspaceId = 'demo-workspace'; // TODO: Extract from auth context
```

**Impact:** Auto-resolve, stale alert cleanup, snooze management don't work for real users.

**Solution:**
```typescript
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

@Get('auto-resolve')
async getAutoResolveConfig(@WorkspaceId() workspaceId: string) {
    return this.hygieneService.getAutoResolveConfig(workspaceId);
}
```

---

#### 2. Uptime Notifications Not Sent
**File:** `apps/api/src/uptime/uptime.service.ts:217-220`

**Problem:**
```typescript
if (lastResult && lastResult.status !== status) {
    this.logger.log(`Uptime status changed...`);
    // TODO: Send notification on status change
}
```

**Impact:** Endpoints go down, nobody knows!

**Solution:**
```typescript
if (lastResult && lastResult.status !== status) {
    // Notify on status change
    if (status === 'down') {
        await this.slackNotificationService.sendUptimeAlert(
            check.workspaceId,
            check.name,
            check.url,
            'down',
            errorMessage
        );
    } else if (status === 'up' && lastResult.status === 'down') {
        // Recovery notification
        await this.slackNotificationService.sendUptimeAlert(
            check.workspaceId,
            check.name,
            check.url,
            'recovered',
            null
        );
    }
}
```

---

#### 3. Breadcrumbs Not Extracted
**File:** `apps/api/src/alerts/alert-processor.service.ts`

**Problem:** Sentry payloads contain breadcrumbs but they're not saved.

**Solution:** In `processSentryEvent()`:
```typescript
// After saving AlertEvent
const breadcrumbs = payload.event?.breadcrumbs || [];
if (breadcrumbs.length > 0 && savedEvent) {
    await Promise.all(breadcrumbs.map(bc => 
        prisma.breadcrumb.create({
            data: {
                alertEventId: savedEvent.id,
                type: bc.type || 'default',
                category: bc.category,
                message: bc.message || '',
                level: bc.level || 'info',
                data: bc.data,
                timestamp: new Date(bc.timestamp * 1000),
            }
        })
    ));
}
```

---

### Medium Priority Gaps

#### 4. Analytics API Missing
**Current:** Page uses `generateSampleData()` when API fails.  
**Fix:** Create `/api/dashboard/analytics` endpoint.

#### 5. Session Replay Pipeline Incomplete
**Needed:**
1. Install `rrweb` in client SDK
2. Configure Cloudflare R2 for storage
3. Install `rrweb-player` in frontend
4. Update `SessionReplayService` to use presigned URLs

#### 6. Correlation Rules UI Missing
**Needed:** Add `/dashboard/correlations` page with CRUD.

---

## Technical Debt

### Code Quality Issues

| Issue | Location | Severity |
|-------|----------|----------|
| Hardcoded workspace ID | `hygiene.controller.ts` | 🔴 Critical |
| Missing error boundaries | Frontend pages | 🟡 Medium |
| No rate limiting on webhooks | `webhooks.controller.ts` | 🟡 Medium |
| No unit tests | Entire codebase | 🟡 Medium |
| TypeScript `any` usage | Various services | 🟢 Low |

### Missing Tests

| Test Type | Current Coverage | Target |
|-----------|-----------------|--------|
| Unit tests | 0% | 70% |
| Integration tests | 0% | 50% |
| E2E tests | ~5% | 30% |

---

## Execution Plan

### Phase 1: Critical Fixes (Week 1)

| Day | Task | Owner | Status |
|-----|------|-------|--------|
| 1 | Fix hygiene controller workspace extraction | - | ⬜ |
| 1 | Add uptime status change notifications | - | ⬜ |
| 2 | Parse breadcrumbs from Sentry webhooks | - | ⬜ |
| 2 | Create analytics API endpoint | - | ⬜ |
| 3 | Add webhook rate limiting | - | ⬜ |
| 3-4 | Unit tests for core services | - | ⬜ |
| 5 | Integration tests for alert flow | - | ⬜ |

### Phase 2: Feature Completion (Week 2-3)

| Week | Task | Priority |
|------|------|----------|
| 2 | Email notification channel (SendGrid) | High |
| 2 | API key management | High |
| 2 | Webhook actions in routing rules | High |
| 3 | Correlation rules UI | Medium |
| 3 | Notification logs page | Medium |
| 3 | Team management UI | Medium |

### Phase 3: Session Replay Pipeline (Week 4)

| Task | Description |
|------|-------------|
| Set up Cloudflare R2 | Create bucket, configure CORS |
| Create client SDK | rrweb recording wrapper |
| Presigned URL upload | Secure direct-to-R2 upload |
| Install rrweb-player | Frontend playback |
| Link replays to alerts | Associate by session ID |

### Phase 4: Enterprise Features (Month 2)

| Task | Description |
|------|-------------|
| PagerDuty integration | OAuth + incident creation |
| Opsgenie integration | OAuth + alert creation |
| SAML SSO | Enterprise auth |
| Audit logging | Track all actions |
| Role-based access | Admin/Member/Viewer |

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Session replay storage costs | Medium | High | R2 lifecycle policies, compression |
| Escalation queue failures | Low | High | BullMQ retry logic, dead letter queue |
| AI API rate limits | Medium | Medium | Caching, fallback messages |
| Slack rate limits | Low | Medium | Queue batching |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Competition (Sentry/PagerDuty) | High | High | Focus on AI differentiation |
| Enterprise feature expectations | Medium | Medium | Prioritize SSO, audit logs |
| Free tier abuse | Medium | Low | Usage limits, workspace caps |

---

## Appendix: Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for BullMQ queues |
| `CLERK_SECRET_KEY` | Clerk authentication |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend |
| `OPENROUTER_API_KEY` | AI suggestions |
| `SLACK_CLIENT_ID` | Slack OAuth |
| `SLACK_CLIENT_SECRET` | Slack OAuth |
| `SLACK_REDIRECT_URI` | OAuth callback |

### Optional

| Variable | Description |
|----------|-------------|
| `SENTRY_WEBHOOK_SECRET` | Verify Sentry signatures |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_BUCKET_NAME` | Session replay storage |
| `SENDGRID_API_KEY` | Email notifications |

---

## Conclusion

SignalCraft has a **solid foundation** for a production alert management platform. The core alert processing, Slack integration, and routing engine are well-implemented. However, several features are partially built but not connected, and critical fixes are needed before the platform can be used by real teams.

**Immediate Actions:**
1. Fix the hygiene controller (5 min fix)
2. Add uptime notifications (30 min fix)
3. Parse breadcrumbs from Sentry (1 hour)
4. Create analytics endpoint (1 hour)

After these fixes, SignalCraft will be ready for beta testing with real users.
