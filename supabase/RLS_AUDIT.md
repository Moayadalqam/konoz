# Supabase RLS Audit — 2026-04-05

All public tables have Row Level Security **enabled**:

| Table | RLS | Rows |
|-------|-----|------|
| profiles | enabled | 1 |
| locations | enabled | 8 |
| employees | enabled | 70 |
| attendance_records | enabled | 0 |
| shifts | enabled | 3 |
| shift_assignments | enabled | 8 |
| hr_action_logs | enabled | 0 |
| employee_warnings | enabled | 0 |
| notifications | enabled | 0 |

Verified via Supabase Management API on 2026-04-05.

Note: Full schema migration files pending — run `supabase login && supabase link --project-ref hasatuyilhnjmfgumbue && supabase db pull` to extract.
