/*
# WhittleScript — Seed Default CMS Content

1. Purpose
   Populate the CMS with default content for all public pages, navigation,
   testimonials, statistics, pricing plans, FAQ entries, and site settings.
   All content is editable through the Admin CMS.

2. What this migration does
   - Inserts site_settings singleton row.
   - Inserts all public pages (landing, how-it-works, pricing, faq, about,
     contact, terms, privacy) with SEO metadata and published status.
   - Inserts page_versions with JSONB content blocks for each page.
   - Inserts header and footer navigation links.
   - Inserts testimonials, site statistics, pricing plans, and FAQ entries.
   - All inserts use ON CONFLICT DO NOTHING for idempotency.

3. Notes
   - Page content blocks are stored as JSONB arrays. Each block has:
     { "type": "<block_type>", "data": {...}, "hidden": false }
   - The landing page has the richest set of blocks (hero, feature grid,
     philosophy, stats, testimonials, CTA).
   - Other pages use appropriate blocks for their content.
*/

-- ---- Site Settings ----
INSERT INTO site_settings (id, site_name, site_tagline, default_seo_title, default_meta_description, social_twitter, social_linkedin, newsletter_enabled)
VALUES (1, 'WhittleScript', 'Screenplay discovery through real reader engagement',
  'WhittleScript — Discover Screenplays Through Real Reader Engagement',
  'WhittleScript helps writers improve their work, readers discover exceptional screenplays, and industry professionals find projects backed by genuine audience engagement.',
  'https://twitter.com/whittlescript', 'https://linkedin.com/company/whittlescript', true)
ON CONFLICT (id) DO NOTHING;

-- ---- Pages ----
-- We need page IDs for navigation FKs, so we insert pages first, then
-- reference them by slug in a DO block to get IDs for navigation.

INSERT INTO pages (slug, title, template, status, nav_label, nav_visible, footer_visible, seo_title, meta_description, published_at) VALUES
('home', 'WhittleScript — Discover Screenplays Through Real Reader Engagement', 'landing', 'published', 'Home', false, false,
 'WhittleScript — Discover Screenplays Through Real Reader Engagement',
 'WhittleScript helps writers improve their work, readers discover exceptional screenplays, and industry professionals find projects backed by genuine audience engagement.',
 now()),
('how-it-works', 'How It Works — WhittleScript', 'standard', 'published', 'How It Works', true, true,
 'How WhittleScript Works',
 'Learn how WhittleScript connects writers, readers, and industry professionals through authentic reader engagement data.',
 now()),
('pricing', 'Pricing — WhittleScript', 'marketing', 'published', 'Pricing', true, true,
 'WhittleScript Pricing',
 'Simple, transparent pricing for writers, readers, and industry professionals. Start free, upgrade when you need more.',
 now()),
('faq', 'FAQ — WhittleScript', 'standard', 'published', 'FAQ', true, true,
 'Frequently Asked Questions — WhittleScript',
 'Answers to common questions about WhittleScript, script assignments, submission credits, writer protection, and industry accounts.',
 now()),
('about', 'About — WhittleScript', 'standard', 'published', 'About', true, true,
 'About WhittleScript',
 'WhittleScript measures authentic reader behaviour to surface screenplays that consistently keep people reading — not subjective opinions or AI scores.',
 now()),
('contact', 'Contact — WhittleScript', 'contact', 'published', 'Contact', true, true,
 'Contact WhittleScript',
 'Get in touch with the WhittleScript team for general enquiries, support, business partnerships, or media requests.',
 now()),
('terms', 'Terms of Service — WhittleScript', 'legal', 'published', 'Terms', false, true,
 'Terms of Service — WhittleScript',
 'The terms and conditions for using WhittleScript.',
 now()),
('privacy', 'Privacy Policy — WhittleScript', 'legal', 'published', 'Privacy', false, true,
 'Privacy Policy — WhittleScript',
 'How WhittleScript collects, uses, and protects your data.',
 now())
ON CONFLICT (slug) DO NOTHING;

-- ---- Page Versions (content blocks) ----
-- Landing page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'Discover screenplays through real reader engagement.',
    'subheadline', 'WhittleScript helps writers improve their work, readers discover exceptional screenplays, and industry professionals find projects backed by genuine audience engagement.',
    'primary_cta_label', 'Create Free Account',
    'primary_cta_url', '/create-account',
    'secondary_cta_label', 'Learn How It Works',
    'secondary_cta_url', '/how-it-works'
  )),
  jsonb_build_object('type', 'feature_grid', 'hidden', false, 'data', jsonb_build_object(
    'title', 'How WhittleScript Works',
    'subtitle', 'Three audiences. One platform built on authentic reader behaviour.',
    'cards', jsonb_build_array(
      jsonb_build_object('icon', 'PenLine', 'title', 'Writers', 'description', 'Upload screenplays, receive anonymous reader feedback and measure genuine reader engagement.'),
      jsonb_build_object('icon', 'BookOpen', 'title', 'Readers', 'description', 'Read assigned screenplays, leave anonymous reviews and earn submission credits.'),
      jsonb_build_object('icon', 'Clapperboard', 'title', 'Industry', 'description', 'Discover writers and screenplays using meaningful reader behaviour rather than subjective ratings.')
    )
  )),
  jsonb_build_object('type', 'philosophy', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Why WhittleScript?',
    'body', 'WhittleScript is not a screenplay competition. It is not script coverage. It is not AI screenplay scoring. Instead, it measures authentic reader behaviour to help surface screenplays that consistently keep people reading. The more independent readers who engage with a screenplay, the higher the confidence that the engagement analysis represents genuine audience response.',
    'not_items', jsonb_build_array('A screenplay competition', 'Script coverage', 'AI screenplay scoring')
  )),
  jsonb_build_object('type', 'feature_grid', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Feature Highlights',
    'subtitle', 'Everything you need to measure, track, and discover screenplay engagement.',
    'cards', jsonb_build_array(
      jsonb_build_object('icon', 'Eye', 'title', 'Anonymous Reviews', 'description', 'Readers leave honest feedback without bias from knowing the writer.'),
      jsonb_build_object('icon', 'BarChart3', 'title', 'Reader Engagement Analytics', 'description', 'See where readers engage, pause, and stop reading your screenplay.'),
      jsonb_build_object('icon', 'Users', 'title', 'Automatic Reader Assignment', 'description', 'Screenplays are matched to qualified readers automatically.'),
      jsonb_build_object('icon', 'Coins', 'title', 'Submission Credits', 'description', 'Readers earn credits for each review, unlocking more reads.'),
      jsonb_build_object('icon', 'RefreshCw', 'title', 'Revision Tracking', 'description', 'Track how engagement changes across screenplay revisions.'),
      jsonb_build_object('icon', 'Building2', 'title', 'Producer Discovery', 'description', 'Industry professionals find validated screenplays backed by real data.'),
      jsonb_build_object('icon', 'Sparkles', 'title', 'AI Comment Summaries', 'description', 'Reader feedback is summarised into actionable insights.'),
      jsonb_build_object('icon', 'Activity', 'title', 'Reader Behaviour Analytics', 'description', 'Understand reading patterns, completion rates, and return sessions.')
    )
  )),
  jsonb_build_object('type', 'stats', 'hidden', false, 'data', jsonb_build_object(
    'title', 'WhittleScript by the Numbers',
    'subtitle', 'Real engagement from real readers.'
  )),
  jsonb_build_object('type', 'testimonials', 'hidden', false, 'data', jsonb_build_object(
    'title', 'What People Say',
    'subtitle', 'Writers, readers, and industry professionals on WhittleScript.'
  )),
  jsonb_build_object('type', 'cta_banner', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Ready to discover screenplays that matter?',
    'subtitle', 'Join WhittleScript today. Create your free account and start engaging with screenplays.',
    'primary_cta_label', 'Create Free Account',
    'primary_cta_url', '/create-account',
    'secondary_cta_label', 'Learn More',
    'secondary_cta_url', '/about'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'home'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- How It Works page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'How WhittleScript Works',
    'subheadline', 'A platform built on authentic reader behaviour — for writers, readers, and industry professionals.',
    'primary_cta_label', 'Create Free Account',
    'primary_cta_url', '/create-account',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'how_it_works', 'hidden', false, 'data', jsonb_build_object(
    'title', 'For Writers',
    'subtitle', 'Upload your screenplay and let real readers show you what works.',
    'steps', jsonb_build_array(
      jsonb_build_object('title', 'Upload Screenplay', 'description', 'Upload your screenplay to WhittleScript. Your work remains private until you choose to share it.'),
      jsonb_build_object('title', 'Anonymous Assignment', 'description', 'Qualified readers are automatically and anonymously assigned to your screenplay.'),
      jsonb_build_object('title', 'Reader Engagement', 'description', 'Readers engage with your screenplay naturally. We track reading progression, stopping points, and return sessions.'),
      jsonb_build_object('title', 'Analytics', 'description', 'Receive detailed engagement analytics showing where readers engaged, paused, and completed.'),
      jsonb_build_object('title', 'Discovery', 'description', 'Screenplays with strong engagement data become discoverable by industry professionals.')
    )
  )),
  jsonb_build_object('type', 'how_it_works', 'hidden', false, 'data', jsonb_build_object(
    'title', 'For Readers',
    'subtitle', 'Read exceptional screenplays and build your reviewer reputation.',
    'steps', jsonb_build_array(
      jsonb_build_object('title', 'Receive Assigned Screenplay', 'description', 'Screenplays are assigned to you based on your profile and reading history.'),
      jsonb_build_object('title', 'Read Naturally', 'description', 'Read the screenplay at your own pace. Your reading behaviour is recorded anonymously.'),
      jsonb_build_object('title', 'Submit Anonymous Feedback', 'description', 'Leave honest, anonymous feedback about the screenplay.'),
      jsonb_build_object('title', 'Earn Credits', 'description', 'Earn submission credits for each completed review, unlocking more screenplays to read.'),
      jsonb_build_object('title', 'Build Reputation', 'description', 'Your anonymous reviews contribute to a reviewer reputation score over time.')
    )
  )),
  jsonb_build_object('type', 'how_it_works', 'hidden', false, 'data', jsonb_build_object(
    'title', 'For Industry',
    'subtitle', 'Discover screenplays backed by genuine reader engagement data.',
    'steps', jsonb_build_array(
      jsonb_build_object('title', 'Browse Validated Screenplays', 'description', 'Explore screenplays that have been read and validated by multiple independent readers.'),
      jsonb_build_object('title', 'Filter Discoveries', 'description', 'Filter by genre, budget range, engagement metrics, and project type.'),
      jsonb_build_object('title', 'View Engagement Reports', 'description', 'Access detailed engagement reports showing reader behaviour patterns and completion rates.'),
      jsonb_build_object('title', 'Request Introductions', 'description', 'Request introductions to writers whose screenplays show strong audience engagement.')
    )
  )),
  jsonb_build_object('type', 'cta_banner', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Start engaging with screenplays today',
    'subtitle', 'Create your free account and join the WhittleScript community.',
    'primary_cta_label', 'Create Free Account',
    'primary_cta_url', '/create-account',
    'secondary_cta_label', 'View Pricing',
    'secondary_cta_url', '/pricing'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'how-it-works'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- Pricing page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'Simple, transparent pricing',
    'subheadline', 'Start free. Upgrade when you need more. No hidden fees.',
    'primary_cta_label', 'Create Free Account',
    'primary_cta_url', '/create-account',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'pricing_table', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Choose your plan',
    'subtitle', 'Pricing for every stage of your screenplay journey.'
  )),
  jsonb_build_object('type', 'faq_accordion', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Pricing FAQ',
    'subtitle', 'Common questions about WhittleScript pricing.'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'pricing'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- FAQ page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'Frequently Asked Questions',
    'subheadline', 'Everything you need to know about WhittleScript.',
    'primary_cta_label', '',
    'primary_cta_url', '',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'faq_accordion', 'hidden', false, 'data', jsonb_build_object(
    'title', 'General Questions',
    'subtitle', ''
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'faq'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- About page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'About WhittleScript',
    'subheadline', 'Measuring authentic reader behaviour to surface screenplays that consistently keep people reading.',
    'primary_cta_label', '',
    'primary_cta_url', '',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'philosophy', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Our Philosophy',
    'body', 'Traditional screenplay discovery is limited. Competitions are subjective. Coverage is expensive. AI scoring removes the human element. WhittleScript takes a different approach. We measure what real readers actually do when they read a screenplay — not what a single judge or algorithm thinks. Reading progression, continuation decisions, stopping points, return sessions, completion rates, and recommendation decisions. These behavioural signals create a genuine engagement profile that no subjective rating can match. The more independent readers who engage with a screenplay, the higher the confidence that the analysis represents real audience response.',
    'not_items', jsonb_build_array('A screenplay competition', 'Script coverage', 'AI screenplay scoring')
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Why traditional screenplay discovery is limited',
    'body', 'Screenplay competitions depend on a small number of judges with individual tastes and biases. A single reader can make or break a screenplay, regardless of how it might perform with a wider audience. Script coverage is valuable but expensive and reflects one person opinion. AI screenplay scoring removes the human element entirely, reducing a creative work to a number without context. None of these approaches measure what actually matters: whether real people want to keep reading.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Why authentic reader behaviour matters',
    'body', 'When a reader picks up a screenplay, their behaviour tells a story. Do they read past page ten? Do they come back after a break? Do they finish? Do they recommend it to a friend? These signals are honest because they are behavioural, not opinion-based. A reader might say they liked a screenplay but never finished it. The data shows the truth. By aggregating behaviour from many independent readers, WhittleScript creates engagement profiles that represent genuine audience response — the same signal that studios and producers care about when they greenlight a project.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Our mission',
    'body', 'WhittleScript exists to give writers a fair, data-driven way to demonstrate audience interest in their work. To give readers a way to discover exceptional screenplays and build a reputation as a reviewer. And to give industry professionals a way to find projects backed by real engagement data rather than hype or connections. We believe the best screenplays should rise to the top because people genuinely want to read them — not because they won a competition or knew the right person.'
  )),
  jsonb_build_object('type', 'cta_banner', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Join us in changing screenplay discovery',
    'subtitle', 'Create your free account and become part of a platform built on trust and transparency.',
    'primary_cta_label', 'Create Free Account',
    'primary_cta_url', '/create-account',
    'secondary_cta_label', 'How It Works',
    'secondary_cta_url', '/how-it-works'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'about'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- Contact page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'Contact Us',
    'subheadline', 'We would love to hear from you. Reach out with any questions, ideas, or partnership opportunities.',
    'primary_cta_label', '',
    'primary_cta_url', '',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'contact_form', 'hidden', false, 'data', jsonb_build_object(
    'title', 'Send us a message',
    'subtitle', 'Fill out the form below and we will get back to you as soon as possible.'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'contact'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- Terms page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'Terms of Service',
    'subheadline', 'The terms and conditions for using WhittleScript.',
    'primary_cta_label', '',
    'primary_cta_url', '',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '1. Acceptance of Terms',
    'body', 'By accessing and using WhittleScript, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, you should not use the platform. These terms apply to all users, including writers, readers, industry professionals, and administrators.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '2. User Accounts',
    'body', 'You must be at least 18 years old to create an account. You are responsible for maintaining the security of your account and password. You agree to provide accurate information during registration and to keep your information up to date. WhittleScript reserves the right to suspend or terminate accounts that violate these terms.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '3. Content and Intellectual Property',
    'body', 'You retain all rights to your screenplays and any content you upload to WhittleScript. By uploading content, you grant WhittleScript a license to display and analyze your content for the purpose of providing engagement analytics and reader assignment features. You agree not to upload content that infringes on the intellectual property rights of others.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '4. Reader Engagement and Analytics',
    'body', 'WhittleScript tracks reader behaviour including reading progression, stopping points, return sessions, and completion rates. This data is aggregated and anonymized. Engagement analytics are provided to writers to help them understand how readers interact with their work. The platform does not share individual reader identities with writers.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '5. Prohibited Conduct',
    'body', 'You agree not to: upload content you do not have the right to upload; attempt to manipulate engagement data; harass or impersonate other users; use the platform for any illegal or unauthorized purpose; or attempt to disrupt the service. Violations may result in account termination.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '6. Disclaimer of Warranties',
    'body', 'WhittleScript is provided as is without warranties of any kind. We do not guarantee that the platform will be uninterrupted, error-free, or secure. Engagement analytics are provided for informational purposes and should not be the sole basis for creative or business decisions.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '7. Limitation of Liability',
    'body', 'WhittleScript shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount you have paid us in the preceding twelve months.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '8. Changes to These Terms',
    'body', 'We may update these Terms of Service from time to time. We will notify users of significant changes. Continued use of the platform after changes constitutes acceptance of the updated terms.'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'terms'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- Privacy page blocks
INSERT INTO page_versions (page_id, version_number, blocks, is_published, is_current, published_at)
SELECT p.id, 1, jsonb_build_array(
  jsonb_build_object('type', 'hero', 'hidden', false, 'data', jsonb_build_object(
    'headline', 'Privacy Policy',
    'subheadline', 'How WhittleScript collects, uses, and protects your data.',
    'primary_cta_label', '',
    'primary_cta_url', '',
    'secondary_cta_label', '',
    'secondary_cta_url', ''
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '1. Information We Collect',
    'body', 'We collect information you provide during registration, including your username, email address, date of birth, country, and role selection. For industry accounts, we may collect additional professional information. We also collect behavioural data from reader engagement sessions, including reading progression, stopping points, and completion rates.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '2. How We Use Your Information',
    'body', 'We use your information to provide and improve the platform, to match readers with screenplays, to generate engagement analytics, and to communicate with you about your account. We do not sell your personal information to third parties.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '3. Data Security',
    'body', 'We take reasonable measures to protect your data, including encryption, access controls, and regular security reviews. However, no method of transmission over the internet is completely secure. We strive to protect your information but cannot guarantee absolute security.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '4. Reader Anonymity',
    'body', 'Reader engagement data is collected anonymously. Writers receive aggregated engagement analytics but cannot see which specific readers read their screenplays. Reader identities are never shared with writers or industry professionals.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '5. Data Retention',
    'body', 'We retain your account information for as long as your account is active. You may request deletion of your account at any time. Engagement data may be retained in anonymized, aggregated form after account deletion for analytics purposes.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '6. Your Rights',
    'body', 'You have the right to access, correct, or delete your personal information. You may also object to certain processing of your data. To exercise these rights, contact us through the Contact page.'
  )),
  jsonb_build_object('type', 'rich_text', 'hidden', false, 'data', jsonb_build_object(
    'title', '7. Changes to This Policy',
    'body', 'We may update this Privacy Policy from time to time. We will notify users of significant changes. Continued use of the platform after changes constitutes acceptance of the updated policy.'
  ))
), true, true, now()
FROM pages p WHERE p.slug = 'privacy'
AND NOT EXISTS (SELECT 1 FROM page_versions pv WHERE pv.page_id = p.id);

-- ---- Navigation ----
-- Header nav (sorted by sort_order)
DO $$
DECLARE
  p_how uuid; p_pricing uuid; p_faq uuid; p_about uuid; p_contact uuid;
  p_terms uuid; p_privacy uuid;
BEGIN
  SELECT id INTO p_how FROM pages WHERE slug = 'how-it-works';
  SELECT id INTO p_pricing FROM pages WHERE slug = 'pricing';
  SELECT id INTO p_faq FROM pages WHERE slug = 'faq';
  SELECT id INTO p_about FROM pages WHERE slug = 'about';
  SELECT id INTO p_contact FROM pages WHERE slug = 'contact';
  SELECT id INTO p_terms FROM pages WHERE slug = 'terms';
  SELECT id INTO p_privacy FROM pages WHERE slug = 'privacy';

  -- Header
  INSERT INTO navigation (label, location, page_id, sort_order, is_visible) VALUES
    ('How It Works', 'header', p_how, 1, true),
    ('Pricing', 'header', p_pricing, 2, true),
    ('FAQ', 'header', p_faq, 3, true),
    ('About', 'header', p_about, 4, true),
    ('Contact', 'header', p_contact, 5, true)
  ON CONFLICT DO NOTHING;

  -- Footer
  INSERT INTO navigation (label, location, page_id, sort_order, is_visible) VALUES
    ('About', 'footer', p_about, 1, true),
    ('How It Works', 'footer', p_how, 2, true),
    ('Pricing', 'footer', p_pricing, 3, true),
    ('FAQ', 'footer', p_faq, 4, true),
    ('Contact', 'footer', p_contact, 5, true),
    ('Terms', 'footer', p_terms, 6, true),
    ('Privacy', 'footer', p_privacy, 7, true)
  ON CONFLICT DO NOTHING;
END $$;

-- ---- Testimonials ----
INSERT INTO testimonials (author_name, author_role, author_company, quote, rating, sort_order, is_visible) VALUES
('Sarah Mitchell', 'Screenwriter', 'Independent',
 'WhittleScript gave me something no competition ever could — real data showing where readers stopped reading and where they leaned in. It changed how I approach my second act.',
 5, 1, true),
('James Cooper', 'Development Executive', 'Northstar Pictures',
 'We found a writer through WhittleScript whose screenplay had a 78% completion rate across twelve independent readers. That kind of signal does not exist anywhere else.',
 5, 2, true),
('Priya Sharma', 'Reader', 'Independent',
 'I have read over forty screenplays on WhittleScript. The anonymous system means I can be completely honest in my feedback without worrying about hurting anyone feelings.',
 5, 3, true),
('David Okonkwo', 'Independent Producer', 'Okonkwo Films',
 'The engagement reports are a game changer. Instead of relying on one person opinion, I can see how a screenplay actually performs with real readers before I invest my time.',
 5, 4, true),
('Elena Volkov', 'Writer-Director', 'Independent',
 'After my third revision, my completion rate went from 45% to 71%. Seeing that improvement in real reader behaviour was more valuable than any coverage I have ever paid for.',
 5, 5, true),
('Marcus Bennett', 'Literary Manager', 'Sterling & Stone',
 'Every client I sign now goes through WhittleScript first. The engagement data helps me identify which projects are ready to take to market and which need another draft.',
 5, 6, true)
ON CONFLICT DO NOTHING;

-- ---- Site Statistics ----
INSERT INTO site_statistics (label, value, suffix, icon, sort_order, is_visible) VALUES
('Screenplays Uploaded', 1248, '+', 'FileText', 1, true),
('Reviews Completed', 8432, '+', 'CheckCircle', 2, true),
('Active Readers', 2156, '+', 'Users', 3, true),
('Industry Members', 387, '+', 'Building2', 4, true)
ON CONFLICT DO NOTHING;

-- ---- Pricing Plans ----
INSERT INTO pricing_plans (name, description, price_monthly, price_yearly, currency, features, cta_label, cta_url, is_featured, status, sort_order, is_visible) VALUES
('Free', 'Perfect for writers getting started with reader engagement.',
  0.00, 0.00, 'USD',
  '["Upload up to 3 screenplays", "Anonymous reader feedback", "Basic engagement analytics", "Community support"]'::jsonb,
  'Get Started', '/create-account', false, 'active', 1, true),
('Pro', 'Advanced tools for serious writers who want deeper insights.',
  19.00, 190.00, 'USD',
  '["Everything in Free", "Unlimited screenplays", "Advanced engagement analytics", "Revision tracking", "AI comment summaries", "Priority reader assignment"]'::jsonb,
  'Coming Soon', '/create-account', true, 'coming_soon', 2, true),
('Industry', 'For producers, studios, and industry professionals discovering talent.',
  49.00, 490.00, 'USD',
  '["Browse validated screenplays", "Engagement reports", "Filter by genre and budget", "Request introductions to writers", "Team access", "Priority support"]'::jsonb,
  'Get Started', '/create-account', false, 'active', 3, true)
ON CONFLICT DO NOTHING;

-- ---- FAQ Entries ----
INSERT INTO faq_entries (question, answer, category, sort_order, is_visible) VALUES
('What is WhittleScript?', 'WhittleScript is a screenplay discovery and audience engagement platform. It measures authentic reader behaviour — reading progression, continuation decisions, stopping points, return sessions, and completion rates — to help writers improve their work, readers discover exceptional screenplays, and industry professionals find projects backed by genuine audience engagement.', 'General', 1, true),
('How are scripts assigned?', 'Screenplays are automatically and anonymously assigned to qualified readers based on their profile and reading history. Writers do not choose who reads their work, and readers do not choose which screenplays they receive. This ensures that engagement data is unbiased and represents genuine reader behaviour.', 'Readers', 2, true),
('Can readers choose scripts?', 'No. Readers cannot browse or select specific screenplays. Scripts are assigned to them automatically. This prevents selection bias and ensures that engagement data reflects how a general audience would respond to a screenplay, not just readers who were already interested in the premise.', 'Readers', 3, true),
('How do submission credits work?', 'Readers earn submission credits for each completed review. Credits unlock access to more screenplays to read. The more reviews a reader completes, the more screenplays they can access. This system ensures that readers are motivated to provide thoughtful feedback and that the reader pool remains active.', 'Readers', 4, true),
('How are writers protected?', 'Writers retain all rights to their screenplays. WhittleScript does not claim ownership of any uploaded content. Reader engagement data is collected anonymously, and individual reader identities are never shared with writers or industry professionals. Writers can remove their screenplays from the platform at any time.', 'Writers', 5, true),
('Can producers contact writers?', 'Industry professionals can request introductions to writers whose screenplays show strong engagement data. Writers have full control over whether to accept or decline these requests. WhittleScript facilitates the connection but does not share writer contact information without explicit consent.', 'Industry', 6, true),
('How is AI used?', 'WhittleScript uses AI to summarise reader feedback into actionable insights. AI does not score or evaluate screenplays. The platform measures real human reader behaviour, not algorithmic predictions. AI is used only to help writers understand patterns in reader feedback more efficiently.', 'General', 7, true),
('Is my screenplay secure?', 'Yes. Screenplays are stored securely and are only accessible to assigned readers and the writer. Screenplays are not publicly visible unless the writer chooses to make them discoverable by industry professionals. All data is encrypted in transit and at rest.', 'Writers', 8, true),
('Can I upload revisions?', 'Yes. Writers can upload new revisions of their screenplays. WhittleScript tracks engagement across revisions, allowing writers to see how changes affect reader behaviour. This revision tracking helps writers understand which changes improve engagement and which do not.', 'Writers', 9, true),
('How do Industry accounts work?', 'Industry accounts are for producers, executives, agents, and other professionals who want to discover screenplays backed by engagement data. Industry members can browse validated screenplays, view engagement reports, filter by genre and budget, and request introductions to writers. Company representatives receive a Company Verified badge after email verification.', 'Industry', 10, true)
ON CONFLICT DO NOTHING;
