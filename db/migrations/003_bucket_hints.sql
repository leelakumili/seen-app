-- Seen v0.3.0 — Update bucket hints for completeness

-- Add hiring and cross-team facilitation to leadership-org hint
UPDATE buckets
SET promo_criteria_hint = 'Process improvements, culture, team health, hiring, cross-team facilitation'
WHERE id = 'leadership-org';

-- Clarify people-impact to cover EM and IC patterns
UPDATE buckets
SET promo_criteria_hint = 'Mentorship, unblocking, career development of others, hiring panel participation'
WHERE id = 'people-impact';
