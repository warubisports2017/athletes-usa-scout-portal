@~/.claude/CLAUDE.md
@~/.claude/ECOSYSTEM.md

# Scout Portal

## About
Scout portal for AUSA affiliates to track leads, share referral links, and view commissions.

## Supabase
- Project: Athletes USA (shared)
- ID: wwomwawpxmkrykybpqok
- Region: us-east-1

## Vercel
- App: scout-portal-steel
- URL: https://scout-portal-steel.vercel.app

## Key Tables
- `scouts` - Scout profiles with commission settings
- `scout_commissions` - Commission records per athlete
- `scout_resources` - Marketing materials and training
- `scout_notification_prefs` - Email/push preferences
- `athletes.referred_by_scout_id` - Links athletes to scouts
- `coach_conversations` - AI coach chat threads (one active per scout)
- `coach_messages` - Individual chat messages with token/latency tracking

## Features
1. **Dashboard** - Stats overview, leads preview, quick actions
2. **My Leads** - Full list with status timeline
3. **Coach** - In-app AI scouting assistant (Gemini 2.5 Flash, streaming)
4. **Share Links** - Copy, WhatsApp, QR code generation (in More menu)
5. **Commissions** - Earnings tracking (in More menu)
6. **Events** - Upcoming showcases & events (in More menu)
7. **Resources** - Marketing materials, FAQs (in More menu)
8. **Settings** - Notification preferences (in More menu)

## Status Mapping
| Status | Color | Description |
|--------|-------|-------------|
| Lead Created | Gray | Just signed up |
| Eval Call | Yellow | Call scheduled/completed |
| Assessment | Orange | AUSA evaluated |
| Signed | Blue | Paying client |
| In Process | Purple | Working toward placement |
| Placed | Green | Success! |

## Auth Flow
- Scouts authenticate via Supabase Auth (email/password)
- Scout ID = auth.uid()
- RLS policies scope data to scout's own records

## Integration Points
- Athlete Portal captures `?ref=` param → `athletes.referred_by_scout_id`
- Quick View shows scout attribution
- Status changes trigger notification Edge Function
