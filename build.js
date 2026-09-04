#!/usr/bin/env node
/**
 * Cool Tech People — Site Builder
 *
 * Reads every profile from /data/profiles/*.json and generates:
 *   - {slug}-profile.html for each person (from templates/profile.template.html)
 *   - profiles-data.js — ONE shared data file used by both index.html and directory.html
 *
 * To add a new profile: drop a new JSON file in /data/profiles/, add their
 * headshot to /images/, run `node build.js`, commit, push. That's it.
 *
 * FILTERING: The directory page filters by three independent axes — Role,
 * Tool/Software, and Country. All three option lists below are generated
 * automatically from whatever's actually in your profile JSON files. You
 * never edit a filter list by hand — add a new roleTag, expertise tag, or
 * country to a profile's JSON, run the build, and it just appears.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data', 'profiles');
const OUT_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'profile.template.html');

// Which expertise categories count as "tools" (software/hardware) for the
// Tool filter row. "Production" (Touring, Corporate, etc.) describes event
// types, not tools, and "Certified Trainers" is covered by the Role filter
// instead — so both are excluded here on purpose.
const TOOL_CATEGORIES = ['Media Servers', 'LED', 'Projection', 'Broadcast & Switching', 'Creative & Graphics'];

// Nicer display labels for slugs that don't title-case cleanly (acronyms,
// possessives, brand names). Anything not listed here is auto-title-cased
// from its slug, so most new tools/roles need zero manual work here.
const LABEL_OVERRIDES = {
  'led': 'LED',
  'led-technician': 'LED Technician',
  'led-processing': 'LED Processing',
  'led-systems': 'LED Systems',
  'atem': 'ATEM',
  'barco-e2': 'Barco E2',
  'barco-e3': 'Barco E3',
  'brompton-tessera': 'Brompton Tessera',
  'megapixel-helios': 'Megapixel Helios',
  'novastar': 'NovaStar',
  'pandora-s-box': "Pandora's Box",
  'disguise-omnical': 'Disguise | Omnical',
  'disguise-certified-trainer': 'Disguise Certified Trainer',
  'ross-carbonite': 'Ross Carbonite',
  'video-systems': 'Video Systems',
  'technical-direction': 'Technical Direction'
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str);
}

function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function labelFor(slug) {
  if (LABEL_OVERRIDES[slug]) return LABEL_OVERRIDES[slug];
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function loadProfiles() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderExpertiseBlocks(expertise) {
  return Object.entries(expertise).map(([category, tags]) => `
      <div class="expertise-category">
        <div class="expertise-category-label">${escapeHtml(category)}</div>
        <div class="expertise-tag-group">
          ${tags.map(t => `<span class="expertise-tag">${escapeHtml(t)}</span>`).join('\n          ')}
        </div>
      </div>`).join('\n');
}

function renderProjectBlocks(projects) {
  return projects.map(p => `    <div class="project-item">
      <div class="project-title">${escapeHtml(p.title)}</div>
      <div class="project-desc">${escapeHtml(p.desc)}</div>
    </div>`).join('\n');
}

function renderContactBlocks(profile) {
  const c = profile.contact || {};
  const blocks = [];

  blocks.push(`    <div class="contact-item">
      <div class="contact-label">Email</div>
      <div class="contact-value">${c.email ? `<a href="mailto:${c.email}">${c.email}</a>` : '—'}</div>
    </div>`);
  
  if (c.phone) {
  blocks.push(`    <div class="contact-item">
      <div class="contact-label">Phone</div>
      <div class="contact-value"><a href="tel:${c.phone.replace(/[^0-9+]/g, '')}">${c.phone}</a></div>
    </div>`);
  }
  
  if (c.website) {
    blocks.push(`    <div class="contact-item">
      <div class="contact-label">Website</div>
      <div class="contact-value">${c.website.startsWith('http') ? `<a href="${c.website}">${c.website.replace(/^https?:\/\//, '')}</a>` : c.website}</div>
    </div>`);
  }

  if (c.instagram) {
    const handle = c.instagram.replace(/\/$/, '').split('/').pop();
    blocks.push(`    <div class="contact-item">
      <div class="contact-label">Instagram</div>
      <div class="contact-value"><a href="${c.instagram}">@${handle}</a></div>
    </div>`);
  }

  if (c.linkedin) {
    const handle = c.linkedin === '#' ? null : c.linkedin.replace(/\/$/, '').split('/').pop();
    blocks.push(`    <div class="contact-item">
      <div class="contact-label">LinkedIn</div>
      <div class="contact-value"><a href="${c.linkedin}">${handle ? 'linkedin.com/in/' + handle : 'LinkedIn'}</a></div>
    </div>`);
  }

  blocks.push(`    <div class="contact-item">
      <div class="contact-label">Based In</div>
      <div class="contact-value">${escapeHtml(profile.locationOverride || profile.city)}</div>
    </div>`);

  if (profile.availableFor) {
    blocks.push(`    <div class="contact-item">
      <div class="contact-label">Available For</div>
      <div class="contact-value">${escapeHtml(profile.availableFor)}</div>
    </div>`);
  }

  if (profile.status) {
    blocks.push(`    <div class="contact-item">
      <div class="contact-label">Status</div>
      <div class="contact-value contact-status-box">${escapeHtml(profile.status)}</div>
    </div>`);
  }

  return blocks.join('\n');
}

function renderProfilePage(profile, template) {
  return template
    .replaceAll('{{NAME}}', escapeHtml(profile.name))
    .replaceAll('{{TITLE}}', escapeHtml(profile.title))
    .replaceAll('{{PHOTO}}', escapeHtml(profile.photo))
    .replaceAll('{{PHOTO_POSITION}}', escapeHtml(profile.photoPosition || 'center top'))
    .replaceAll('{{BIO}}', escapeHtml(profile.bio))
    .replaceAll('{{EXPERTISE_BLOCKS}}', renderExpertiseBlocks(profile.expertise))
    .replaceAll('{{PROJECT_BLOCKS}}', renderProjectBlocks(profile.projects))
    .replaceAll('{{CONTACT_BLOCKS}}', renderContactBlocks(profile));
}

function getToolSlugs(profile) {
  return Object.entries(profile.expertise)
    .filter(([category]) => TOOL_CATEGORIES.includes(category))
    .flatMap(([, tags]) => tags)
    .map(slugify);
}

function buildProfilesDataJs(profiles) {
  const records = profiles.map(p => ({
    name: p.name,
    title: p.title,
    city: p.city,
    country: p.country || '',
    roles: p.roleTags || [],
    tools: getToolSlugs(p),
    photo: p.photo,
    profile: `${p.slug}-profile.html`,
    position: p.photoPosition || 'center top',
    tags: p.cardTags || []
  }));

  // Filter option lists — derived from the data itself, not hand-maintained.
  const roleSlugs = [...new Set(profiles.flatMap(p => p.roleTags || []))].sort();
  const toolSlugs = [...new Set(profiles.flatMap(p => getToolSlugs(p)))].sort();
  const countries = [...new Set(profiles.map(p => p.country).filter(Boolean))].sort();

  const ROLES = roleSlugs.map(slug => ({ value: slug, label: labelFor(slug) }));
  const TOOLS = toolSlugs.map(slug => ({ value: slug, label: labelFor(slug) }));

  return `// AUTO-GENERATED by build.js — do not edit by hand.
// Edit /data/profiles/*.json instead, then run \`node build.js\`.
const PROFILES = ${JSON.stringify(records, null, 2)};
const ROLES = ${JSON.stringify(ROLES, null, 2)};
const TOOLS = ${JSON.stringify(TOOLS, null, 2)};
const COUNTRIES = ${JSON.stringify(countries, null, 2)};
if (typeof module !== 'undefined') module.exports = { PROFILES, ROLES, TOOLS, COUNTRIES };
`;
}

function copyStaticAssets() {
  const staticDir = path.join(__dirname, 'static');
  if (fs.existsSync(staticDir)) {
    fs.readdirSync(staticDir).forEach(file => {
      fs.copyFileSync(path.join(staticDir, file), path.join(OUT_DIR, file));
      console.log(`✓ copied ${file}`);
    });
  }
  fs.copyFileSync(path.join(__dirname, 'styles.css'), path.join(OUT_DIR, 'styles.css'));
  console.log('✓ copied styles.css');

  const imagesSrc = path.join(__dirname, 'images');
  const imagesOut = path.join(OUT_DIR, 'images');
  if (fs.existsSync(imagesSrc)) {
    if (!fs.existsSync(imagesOut)) fs.mkdirSync(imagesOut, { recursive: true });
    fs.readdirSync(imagesSrc).forEach(file => {
      if (file === '.gitkeep') return;
      fs.copyFileSync(path.join(imagesSrc, file), path.join(imagesOut, file));
    });
  }
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const profiles = loadProfiles();
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  profiles.forEach(profile => {
    const html = renderProfilePage(profile, template);
    const outPath = path.join(OUT_DIR, `${profile.slug}-profile.html`);
    fs.writeFileSync(outPath, html);
    console.log(`✓ built ${profile.slug}-profile.html`);
  });

  const dataJs = buildProfilesDataJs(profiles);
  fs.writeFileSync(path.join(OUT_DIR, 'profiles-data.js'), dataJs);
  console.log(`✓ built profiles-data.js (${profiles.length} profiles)`);

  copyStaticAssets();

  console.log(`\nDone. ${profiles.length} profiles + full site built to /dist.`);
  console.log('This /dist folder is what you deploy.');
}

main();
