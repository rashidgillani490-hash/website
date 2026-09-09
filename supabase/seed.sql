-- ============================================================================
-- Maison Lumière — Phase 2 · Demo / sample data
--
-- This seed reproduces the Phase 1 sample content inside the real schema so the
-- storefront stays visually complete. It is DEMO data only: every row here is
-- meant to be edited or replaced by the client through the Admin Dashboard.
-- Idempotent — safe to run repeatedly (all inserts use ON CONFLICT DO NOTHING).
-- ============================================================================

-- ---------------------------------------------------------------- categories
insert into public.categories (slug, name, subtitle, description, hero_image_url, accent_color, position, is_active) values
  ('lumiere', 'Lumière', 'The signature line',
   'The core wardrobe of the maison — luminous, skin-close compositions built around a single grown material.',
   'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1400&q=80', '#c8a866', 1, true),
  ('nocturne', 'Nocturne', 'After dark',
   'Deeper, resinous, warm. Ambers and woods aged longer for weight and shadow.',
   'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1400&q=80', '#7c5cff', 2, true),
  ('jardin', 'Jardin Clos', 'The walled garden',
   'Green, dewy and transparent — a portrait of the maison terraces at first light.',
   'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=1400&q=80', '#4a9d7f', 3, true),
  ('archive', 'Archive Editions', 'Numbered & limited',
   'Re-issues from the maison archive and single-harvest experiments, released in small numbered runs.',
   'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1400&q=80', '#b5643c', 4, true)
on conflict (slug) do nothing;

-- ----------------------------------------------------------- fragrance_notes
insert into public.fragrance_notes (slug, name, family) values
  ('calabrian-bergamot', 'Calabrian Bergamot', 'Citrus'),
  ('bergamot', 'Bergamot', 'Citrus'),
  ('bitter-orange', 'Bitter Orange', 'Citrus'),
  ('pink-grapefruit', 'Pink Grapefruit', 'Citrus'),
  ('mandarin', 'Mandarin', 'Citrus'),
  ('white-peach', 'White Peach', 'Fruity'),
  ('lychee', 'Lychee', 'Fruity'),
  ('black-plum', 'Black Plum', 'Fruity'),
  ('jasmine-grandiflorum', 'Jasmine Grandiflorum', 'Floral'),
  ('orange-blossom', 'Orange Blossom', 'Floral'),
  ('orange-blossom-absolute', 'Orange Blossom Absolute', 'Floral'),
  ('neroli', 'Neroli', 'Floral'),
  ('centifolia-rose-absolute', 'Centifolia Rose Absolute', 'Floral'),
  ('centifolia-rose', 'Centifolia Rose', 'Floral'),
  ('peony', 'Peony', 'Floral'),
  ('iris', 'Iris', 'Floral'),
  ('orris', 'Orris', 'Floral'),
  ('orris-butter', 'Orris Butter', 'Floral'),
  ('spiced-carnation', 'Spiced Carnation', 'Floral'),
  ('tuberose', 'Tuberose', 'Floral'),
  ('galbanum', 'Galbanum', 'Green'),
  ('violet-leaf', 'Violet Leaf', 'Green'),
  ('fig-leaf', 'Fig Leaf', 'Green'),
  ('petitgrain', 'Petitgrain', 'Green'),
  ('pale-sandalwood', 'Pale Sandalwood', 'Woody'),
  ('blond-woods', 'Blond Woods', 'Woody'),
  ('blond-cedar', 'Blond Cedar', 'Woody'),
  ('haitian-vetiver', 'Haitian Vetiver', 'Woody'),
  ('guaiac-wood', 'Guaiac Wood', 'Woody'),
  ('almond-woods', 'Almond Woods', 'Woody'),
  ('oud-accord', 'Oud Accord', 'Woody'),
  ('labdanum', 'Labdanum', 'Amber'),
  ('immortelle', 'Immortelle', 'Amber'),
  ('siam-benzoin', 'Siam Benzoin', 'Amber'),
  ('white-musk', 'White Musk', 'Musky'),
  ('dry-leather', 'Dry Leather', 'Leather'),
  ('birch-tar-leather', 'Birch Tar Leather', 'Leather'),
  ('pink-pepper', 'Pink Pepper', 'Spicy'),
  ('cardamom', 'Cardamom', 'Spicy'),
  ('saffron', 'Saffron', 'Spicy'),
  ('aniseed', 'Aniseed', 'Aromatic'),
  ('clary-sage', 'Clary Sage', 'Aromatic'),
  ('acacia-honey', 'Acacia Honey', 'Sweet'),
  ('dry-tonka', 'Dry Tonka', 'Sweet'),
  ('heliotrope', 'Heliotrope', 'Sweet'),
  ('wet-stone-accord', 'Wet Stone Accord', 'Mineral')
on conflict (slug) do nothing;

-- ------------------------------------------------------------------ products
insert into public.products
  (slug, name, tagline, description, story, category_id, concentration, gender, perfumer,
   sillage, longevity, accent_color, families, status, is_featured, is_new, release_year,
   rating, review_count, published_at)
select v.slug, v.name, v.tagline, v.description, v.story, c.id, v.concentration, v.gender, v.perfumer,
       v.sillage, v.longevity, v.accent_color, v.families, 'active'::public.product_status,
       v.is_featured, v.is_new, v.release_year, v.rating, v.review_count, now()
from (values
  ('blanche-heure', 'Blanche Heure',
   'The maison''s first light — jasmine before the sun clears the ridge.',
   'Blanche Heure is built around a single pre-dawn harvest of jasmine grandiflorum, lifted with Calabrian bergamot and set on a bed of pale sandalwood and musk. It reads as clean skin warmed by sun — luminous, close, quietly indulgent.',
   'The composition that made the maison. Éléonore Vaudlin blended the first version in 1991 from essences she had distilled for other houses, deciding the best of the harvest should carry her own name. The formula has been adjusted only twice in three decades.',
   'lumiere', 'Eau de Parfum', 'Feminine', 'Éléonore Vaudlin', 'Moderate', '6–8h', '#e7d9b8',
   array['floral','citrus','woody'], true, false, 1991, 4.8, 214),
  ('nuit-vetiver', 'Nuit Vétiver',
   'Haitian vetiver, cold air and woodsmoke.',
   'A dry, mineral vetiver sharpened with grapefruit and pink pepper, then shadowed by guaiac wood and a whisper of leather. Built for cold mornings and long coats.',
   'Auguste Rey''s answer to a request that kept coming from the atelier''s oldest clients: a vetiver with no sweetness at all. Three years of trials; the released version uses vetiver from a single Haitian cooperative the maison has bought from since 2009.',
   'nocturne', 'Eau de Parfum', 'Masculine', 'Auguste Rey', 'Bold', '8h+', '#3f4a3a',
   array['woody','aromatic','citrus'], true, false, 2016, 4.7, 168),
  ('rose-close', 'Rose Close',
   'Centifolia rose, still wet, held at arm''s length.',
   'The maison''s centifolia rose absolute in near-photographic focus — dewy, faintly green, with a spiced lychee facet and a soft honeyed base. Not a jammy rose; a garden rose an hour after rain.',
   'Distilled entirely from the maison''s own May harvest. In a strong year the entire run is under 900 bottles, which is why Rose Close moves to the Archive line whenever the crop is short.',
   'lumiere', 'Extrait de Parfum', 'Unisex', 'Auguste Rey', 'Intimate', '6–8h', '#d9a7a0',
   array['floral','green'], true, false, 2013, 4.9, 132),
  ('ambre-lumen', 'Ambre Lumen',
   'Amber lit from behind — resin without the weight.',
   'Labdanum and benzoin rendered translucent with bitter orange and a dry tonka. Warm and enveloping but never heavy, it glows on the skin rather than sitting on it.',
   'An exercise in restraint. Rey rebuilt a classic maison amber from 1984, removing the vanillin and coumarin overdose and letting the natural benzoin carry the sweetness. The 1984 version is still in the Archive.',
   'nocturne', 'Eau de Parfum', 'Unisex', 'Auguste Rey', 'Moderate', '8h+', '#c98a3c',
   array['amber','woody','citrus'], true, false, 2019, 4.6, 97),
  ('jardin-clos', 'Jardin Clos',
   'The walled garden at 6am — galbanum, fig, wet stone.',
   'Sharp green galbanum softened by fig leaf and a cool, transparent orris. There''s a mineral coolness underneath, like the smell of a courtyard before the day has warmed it.',
   'The eponymous scent of the Jardin Clos line, composed on site over a full growing season. Rey took cuttings back to the atelier every morning for three months to keep the accord honest.',
   'jardin', 'Eau de Toilette', 'Unisex', 'Auguste Rey', 'Intimate', '4–6h', '#6f8f5e',
   array['green','floral','woody'], false, false, 2011, 4.5, 76),
  ('heure-bleue-77', 'Heure Bleue 77',
   'Archive re-issue — powdery iris and carnation, 1977 formula.',
   'A faithful re-issue of a 1977 maison composition: heliotrope, iris and a spiced carnation over a soft almond-woods base. Nostalgic, powdery, unmistakably vintage in structure.',
   'Reconstructed from the original lab notebook and a sealed reference bottle held in the maison archive. Released in a numbered run of 500 for the house''s 49th year.',
   'archive', 'Extrait de Parfum', 'Feminine', 'Éléonore Vaudlin', 'Moderate', '8h+', '#5566a8',
   array['floral','amber','aromatic'], false, true, 2026, 4.7, 41),
  ('neroli-franc', 'Néroli Franc',
   'Orange blossom, bitter and bright, straight from the still.',
   'A near-soliflore of maison-distilled neroli — honeyed, faintly bitter, green at the edges — over a clean white musk. The most transparent scent in the wardrobe.',
   'Bottled directly from single distillation runs. Because it''s barely a composition, tiny shifts in the harvest show — each batch code smells slightly different, and the maison lists tasting notes per batch.',
   'jardin', 'Eau de Toilette', 'Unisex', 'Auguste Rey', 'Intimate', '4–6h', '#e5c766',
   array['floral','citrus'], false, true, 2025, 4.4, 58),
  ('cuir-centifolia', 'Cuir Centifolia',
   'Rose and leather, aged eighteen months.',
   'The maison''s centifolia rose pressed into a smoky birch-tar leather, with saffron and a dark plum sweetness. Opulent, a little dangerous, built for evening.',
   'The longest-aged composition the maison makes — eighteen months in glass demijohns before bottling. Production is capped at one batch per year.',
   'nocturne', 'Extrait de Parfum', 'Unisex', 'Auguste Rey', 'Bold', '8h+', '#7a2e2e',
   array['floral','woody','amber'], true, false, 2021, 4.8, 63)
) as v(slug, name, tagline, description, story, category_slug, concentration, gender, perfumer,
       sillage, longevity, accent_color, families, is_featured, is_new, release_year, rating, review_count)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

-- Backfill the Phase 3 admin fields for the demo rows.
update public.products
   set short_description = coalesce(short_description, tagline),
       base_sku = coalesce(base_sku, upper(replace(slug, '-', ''))),
       ingredients = coalesce(
         ingredients,
         'Alcohol Denat., Parfum (Fragrance), Aqua (Water), natural isolates from maison-distilled essences. May contain Linalool, Limonene, Citral, Geraniol, Coumarin.'
       )
 where short_description is null or base_sku is null or ingredients is null;

-- Demo customisation configs so the "Make it yours" panel works out of the box.
-- The client edits these from Admin → product → Customisation.
update public.products set customization = jsonb_build_object(
  'enabled', true,
  'allowText', true, 'textMaxLength', 22, 'textPriceCents', 2500,
  'allowImage', true, 'imagePriceCents', 4500,
  'bottleOptions', jsonb_build_array(
    jsonb_build_object('id', 'clear', 'label', 'Clear engraved glass', 'priceCents', 0),
    jsonb_build_object('id', 'frosted', 'label', 'Frosted glass', 'priceCents', 3000),
    jsonb_build_object('id', 'gold-collar', 'label', 'Gilded collar', 'priceCents', 6500)
  ),
  'packagingOptions', jsonb_build_array(
    jsonb_build_object('id', 'standard', 'label', 'Signature box', 'priceCents', 0),
    jsonb_build_object('id', 'lacquer', 'label', 'Hand-lacquered coffret', 'priceCents', 5500),
    jsonb_build_object('id', 'gift', 'label', 'Gift wrap & handwritten card', 'priceCents', 1800)
  )
) where slug = 'blanche-heure';

update public.products set customization = jsonb_build_object(
  'enabled', true,
  'allowText', true, 'textMaxLength', 18, 'textPriceCents', 3000,
  'allowImage', false, 'imagePriceCents', 0,
  'bottleOptions', jsonb_build_array(
    jsonb_build_object('id', 'standard', 'label', 'Standard flacon', 'priceCents', 0),
    jsonb_build_object('id', 'leather', 'label', 'Leather-sleeved flacon', 'priceCents', 9000)
  ),
  'packagingOptions', jsonb_build_array(
    jsonb_build_object('id', 'standard', 'label', 'Signature box', 'priceCents', 0),
    jsonb_build_object('id', 'travel', 'label', 'Travel case + 10ml refill', 'priceCents', 7500)
  )
) where slug = 'cuir-centifolia';

-- ---------------------------------------------------------- product_variants
insert into public.product_variants (product_id, sku, volume_ml, price_cents, stock_quantity, is_default, position)
select p.id, m.sku, m.ml, m.price, m.stock, m.is_default, m.pos
from (values
  ('blanche-heure','BLH-10',10,6020,40,false,0),  ('blanche-heure','BLH-50',50,21500,22,true,1),  ('blanche-heure','BLH-100',100,36550,12,false,2),
  ('nuit-vetiver','NVT-10',10,6580,40,false,0),    ('nuit-vetiver','NVT-50',50,23500,22,true,1),    ('nuit-vetiver','NVT-100',100,39950,12,false,2),
  ('rose-close','RSC-10',10,7840,40,false,0),      ('rose-close','RSC-50',50,28000,22,true,1),      ('rose-close','RSC-100',100,47600,12,false,2),
  ('ambre-lumen','AML-10',10,6300,40,false,0),     ('ambre-lumen','AML-50',50,22500,22,true,1),     ('ambre-lumen','AML-100',100,38250,12,false,2),
  ('jardin-clos','JDC-10',10,5180,40,false,0),     ('jardin-clos','JDC-50',50,18500,22,true,1),     ('jardin-clos','JDC-100',100,31450,12,false,2),
  ('heure-bleue-77','HB77-10',10,8680,40,false,0), ('heure-bleue-77','HB77-50',50,31000,22,true,1), ('heure-bleue-77','HB77-100',100,52700,12,false,2),
  ('neroli-franc','NRF-10',10,4620,40,false,0),    ('neroli-franc','NRF-50',50,16500,22,true,1),    ('neroli-franc','NRF-100',100,28050,12,false,2),
  ('cuir-centifolia','CRC-10',10,9240,40,false,0), ('cuir-centifolia','CRC-50',50,33000,22,true,1), ('cuir-centifolia','CRC-100',100,56100,12,false,2)
) as m(pslug, sku, ml, price, stock, is_default, pos)
join public.products p on p.slug = m.pslug
on conflict (sku) do nothing;

-- ------------------------------------------------------------ product_images
insert into public.product_images (product_id, url, alt, position, is_primary)
select p.id,
       'https://images.unsplash.com/photo-' || m.photo || '?auto=format&fit=crop&w=1200&q=80',
       m.alt, m.pos, m.is_primary
from (values
  ('blanche-heure','1588405748880-12d1d2a59d75','Blanche Heure flacon on stone',0,true),
  ('blanche-heure','1615634260167-c8cdede054de','Jasmine field at dawn',1,false),
  ('nuit-vetiver','1594035910387-fea47794261f','Nuit Vétiver dark flacon',0,true),
  ('nuit-vetiver','1519681393784-d120267933ba','Cold mountain landscape',1,false),
  ('rose-close','1592945403244-b3fbafd7f539','Rose Close flacon with petals',0,true),
  ('rose-close','1526047932273-341f2a7631f9','Rose garden',1,false),
  ('ambre-lumen','1541643600914-78b084683601','Ambre Lumen amber-glass flacon',0,true),
  ('ambre-lumen','1516546453174-5e1098a4b4af','Warm evening light',1,false),
  ('jardin-clos','1615634260167-c8cdede054de','Jardin Clos green-glass flacon',0,true),
  ('jardin-clos','1466781783364-36c955e42a7f','Green garden foliage',1,false),
  ('heure-bleue-77','1567016376408-0226e4d0c1ea','Heure Bleue 77 numbered flacon',0,true),
  ('heure-bleue-77','1493146671510-97f3f4f5e6e5','Blue hour sky',1,false),
  ('neroli-franc','1523293182086-7651a899d37f','Néroli Franc clear flacon',0,true),
  ('neroli-franc','1502741224143-90386d7f8c82','Orange blossom branch',1,false),
  ('cuir-centifolia','1610461888750-10bfc601b874','Cuir Centifolia deep-red flacon',0,true),
  ('cuir-centifolia','1512207736890-6ffed8a84e8d','Dark leather texture',1,false)
) as m(pslug, photo, alt, pos, is_primary)
join public.products p on p.slug = m.pslug
on conflict do nothing;

-- --------------------------------------------------------- product_3d_models
-- Bundled demo flacon for most products; two are left without a model so the
-- image-based fallback is demonstrable. The client replaces these from Admin.
insert into public.product_3d_models (product_id, model_url, format, poster_url, accent_color, is_active)
select
  p.id,
  case when p.slug in ('jardin-clos', 'neroli-franc') then null else '/models/demo-flacon.gltf' end,
  'gltf'::public.model_format,
  (select url from public.product_images i where i.product_id = p.id and i.is_primary limit 1),
  p.accent_color,
  true
from public.products p
on conflict do nothing;

-- ------------------------------------------------------------- product_notes
insert into public.product_notes (product_id, note_id, tier, position)
select p.id, fn.id, m.tier::public.note_tier, m.pos
from (values
  ('blanche-heure','calabrian-bergamot','top',0), ('blanche-heure','white-peach','top',1),
  ('blanche-heure','jasmine-grandiflorum','heart',0), ('blanche-heure','orange-blossom','heart',1),
  ('blanche-heure','pale-sandalwood','base',0), ('blanche-heure','white-musk','base',1),

  ('nuit-vetiver','pink-grapefruit','top',0), ('nuit-vetiver','pink-pepper','top',1),
  ('nuit-vetiver','haitian-vetiver','heart',0), ('nuit-vetiver','clary-sage','heart',1),
  ('nuit-vetiver','guaiac-wood','base',0), ('nuit-vetiver','dry-leather','base',1),

  ('rose-close','lychee','top',0), ('rose-close','violet-leaf','top',1),
  ('rose-close','centifolia-rose-absolute','heart',0), ('rose-close','peony','heart',1),
  ('rose-close','blond-woods','base',0), ('rose-close','acacia-honey','base',1),

  ('ambre-lumen','bitter-orange','top',0), ('ambre-lumen','cardamom','top',1),
  ('ambre-lumen','labdanum','heart',0), ('ambre-lumen','immortelle','heart',1),
  ('ambre-lumen','siam-benzoin','base',0), ('ambre-lumen','dry-tonka','base',1),

  ('jardin-clos','galbanum','top',0), ('jardin-clos','bergamot','top',1),
  ('jardin-clos','fig-leaf','heart',0), ('jardin-clos','orris-butter','heart',1),
  ('jardin-clos','wet-stone-accord','base',0), ('jardin-clos','blond-cedar','base',1),

  ('heure-bleue-77','aniseed','top',0), ('heure-bleue-77','bergamot','top',1),
  ('heure-bleue-77','iris','heart',0), ('heure-bleue-77','spiced-carnation','heart',1),
  ('heure-bleue-77','heliotrope','base',0), ('heure-bleue-77','almond-woods','base',1),

  ('neroli-franc','petitgrain','top',0), ('neroli-franc','mandarin','top',1),
  ('neroli-franc','neroli','heart',0), ('neroli-franc','orange-blossom-absolute','heart',1),
  ('neroli-franc','white-musk','base',0), ('neroli-franc','blond-woods','base',1),

  ('cuir-centifolia','saffron','top',0), ('cuir-centifolia','black-plum','top',1),
  ('cuir-centifolia','centifolia-rose','heart',0), ('cuir-centifolia','orris','heart',1),
  ('cuir-centifolia','birch-tar-leather','base',0), ('cuir-centifolia','oud-accord','base',1)
) as m(pslug, nslug, tier, pos)
join public.products p on p.slug = m.pslug
join public.fragrance_notes fn on fn.slug = m.nslug
on conflict (product_id, note_id, tier) do nothing;

-- ------------------------------------------------------------------- coupons
insert into public.coupons (code, description, discount_type, discount_value, minimum_subtotal_cents, per_user_limit, is_active, starts_at, expires_at) values
  ('DISCOVERY10', '10% off a first order', 'percentage', 10, 0, 1, true, now() - interval '30 days', now() + interval '180 days'),
  ('LUMIERE25',   '$25 off orders over $200', 'fixed_amount', 2500, 20000, 3, true, now() - interval '10 days', now() + interval '90 days'),
  ('ATELIER',     'Complimentary shipping', 'free_shipping', 0, 0, 5, true, null, null)
on conflict (code) do nothing;

-- ------------------------------------------------------------ store_settings
insert into public.store_settings (key, value, description) values
(
  'site_content',
  jsonb_build_object(
    'brandName', 'Maison Lumière',
    'tagline', 'Perfumes composed in light.',
    'announcement', 'Complimentary engraving & 2ml discovery vials with every order over $180.',
    'hero', jsonb_build_object(
      'kicker', 'Maison de Parfum — Grasse, since 1976',
      'title', 'Fragrance, rendered as light.',
      'subtitle', 'A house that grows, distills and composes its own materials. Each perfume is a study in luminosity — worn close to the skin, remembered long after.',
      'ctaPrimary', jsonb_build_object('label', 'Explore the collection', 'href', '/fragrances'),
      'ctaSecondary', jsonb_build_object('label', 'Our craft', 'href', '/about')
    ),
    'intro', jsonb_build_object(
      'heading', 'A single house, from field to flacon',
      'body', jsonb_build_array(
        'Maison Lumière is one of the few perfume houses that still controls every step of its craft. We cultivate our own jasmine and centifolia rose on the terraces above Grasse, distill in copper on site, and age our compositions in the dark for a full season before bottling.',
        'The result is a wardrobe of scent with unusual clarity — perfumes that feel lit from within rather than layered on.'
      )
    ),
    'story', jsonb_build_object(
      'heading', 'Since 1976, in the hills above Grasse',
      'body', jsonb_build_array(
        'Founded by Éléonore Vaudlin, a fourth-generation grower, Maison Lumière began as a distillery supplying essences to the great couture houses. In 1991 we released our first signature — Blanche Heure — and never looked back.',
        'Today the maison is led by master perfumer Auguste Rey, who joined in 2004. Our atelier remains deliberately small: nine noses, one field, and a refusal to release more than two compositions a year.'
      ),
      'stats', jsonb_build_array(
        jsonb_build_object('label', 'Years of craft', 'value', '49'),
        jsonb_build_object('label', 'Hectares of flower fields', 'value', '14'),
        jsonb_build_object('label', 'Compositions in the archive', 'value', '38'),
        jsonb_build_object('label', 'Signatures released per year', 'value', '≤ 2')
      )
    ),
    'values', jsonb_build_array(
      jsonb_build_object('title', 'Grown, not sourced', 'description', 'Our jasmine, rose and tuberose are cultivated on maison-owned terraces and picked before dawn.', 'icon', 'leaf'),
      jsonb_build_object('title', 'Distilled on site', 'description', 'Small-batch copper distillation in Grasse means we control the character of every essence.', 'icon', 'flask'),
      jsonb_build_object('title', 'Aged a full season', 'description', 'Compositions rest in darkness for 90+ days so the materials marry before they reach you.', 'icon', 'sparkles'),
      jsonb_build_object('title', 'Refillable by design', 'description', 'Every flacon is engraved glass with a refill programme — send it back, we replenish it.', 'icon', 'recycle'),
      jsonb_build_object('title', 'Hand-finished', 'description', 'Each bottle is filled, stoppered, waxed and numbered by hand in our atelier.', 'icon', 'hand'),
      jsonb_build_object('title', 'Traceable to the row', 'description', 'A batch code on the base ties your bottle to the exact harvest and distillation.', 'icon', 'globe')
    ),
    'contact', jsonb_build_object(
      'email', 'atelier@maisonlumiere.example',
      'phone', '+33 4 93 00 00 00',
      'addressLines', jsonb_build_array('17 Chemin des Terrasses', '06130 Grasse', 'France'),
      'hours', 'Atelier visits by appointment · Tuesday–Saturday, 10h–17h'
    ),
    'social', jsonb_build_array(
      jsonb_build_object('label', 'Instagram', 'href', 'https://instagram.com'),
      jsonb_build_object('label', 'Pinterest', 'href', 'https://pinterest.com'),
      jsonb_build_object('label', 'Journal', 'href', '/about')
    )
  ),
  'Homepage and site-wide editorial copy. Edited from Admin → Content.'
),
(
  'commerce',
  jsonb_build_object(
    'currency', 'USD',
    'locale', 'en-US',
    'freeShippingThresholdCents', 18000,
    'flatShippingCents', 1200
  ),
  'Storefront commerce configuration. Edited from Admin → Settings.'
)
on conflict (key) do nothing;
