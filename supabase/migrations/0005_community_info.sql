-- Community info settings (Start Here, About, Rules)
-- Admin-editable markdown content displayed on the feed page.

insert into public.settings (key, value) values
  ('community_start_here', 'Welcome to **Sanctum**! This is a space for thoughtful conversation and learning. Here''s how to get started:

1. **Introduce yourself** — Post in the General category and tell us who you are.
2. **Explore the courses** — Unlock lessons by earning points through participation.
3. **Join the conversation** — Comment on posts, reply in threads, and engage with others.

Earn points by posting, commenting, and receiving likes. These points unlock access to gated course lessons.'),
  ('community_about', 'Sanctum is a private community for people who want to go deeper. No algorithms, no ads, no noise — just real conversation between real people.'),
  ('community_rules', '## Community Guidelines

**Be respectful.** Treat everyone with dignity. Disagreement is welcome; personal attacks are not.

**Stay on topic.** Post in the right category. Keep conversations constructive.

**No spam or self-promotion.** Share value, not links to your latest launch.

**Protect privacy.** What''s shared here stays here. Don''t screenshot or redistribute members'' posts.

**No medical or legal advice.** Share experiences, not prescriptions. Always consult a professional.')
on conflict (key) do nothing;
