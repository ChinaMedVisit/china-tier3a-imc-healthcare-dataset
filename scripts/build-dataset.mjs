#!/usr/bin/env node
/**
 * Build Script — ChinaMedVisit Open Healthcare Benchmark Dataset
 *
 * Dynamically parses verified production source-of-truth files (read-only):
 *   - E:/Soft/xoesim/MedVisit/src/data/hospitals.json
 *   - E:/Soft/xoesim/MedVisit/src/data/procedures.ts
 *   - E:/Soft/xoesim/MedVisit/src/data/specialtyKnowledgeBase.ts
 *
 * Outputs (brand-isolated under ChinaMedVisit / admin@chinamedvisit.com):
 *   - data/china_tier3a_imc_hospitals_76.csv                          (76 rows x 20 cols)
 *   - data/china_vs_us_uk_medical_costs_2026.csv                      (12 rows x 20 cols)
 *   - data/china_medical_travel_ancillary_and_packages_2026.csv       (8 rows x 12 cols)
 *   - data/china_specialty_frontier_therapies_24.csv                  (24 rows x 10 cols)
 *   - data/china_specialty_deepdive_comparisons_12.csv                (12 rows x 13 cols)
 *   - datapackage.json
 *   - kaggle/dataset-metadata.json
 *   - notebooks/china_medical_cost_eda.ipynb
 *   - README.md (with Hugging Face Dataset Card YAML frontmatter)
 *
 * License: MIT (script) / CC-BY-4.0 (generated data & metadata)
 * Requires: Node.js 22.6+ / 24+ (native TypeScript type stripping)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE_DIR = process.env.MEDVISIT_DATA_DIR || 'E:/Soft/xoesim/MedVisit/src/data';
const HOSPITALS_JSON_PATH = path.join(SOURCE_DIR, 'hospitals.json');
const PROCEDURES_TS_PATH = path.join(SOURCE_DIR, 'procedures.ts');
const SPECIALTY_KB_TS_PATH = path.join(SOURCE_DIR, 'specialtyKnowledgeBase.ts');

const BASE_URL = 'https://chinamedvisit.com';
const DATASET_VERSION = '2026.11.0';
const RELEASE_DATE = '2026-11-24';
const ZENODO_DOI = '10.5281/zenodo.24488828';
const ZENODO_CONCEPT_DOI = '10.5281/zenodo.24488827';
const ZENODO_RECORD_URL = 'https://zenodo.org/records/24488828';

function writeUtf8Lf(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const normalized = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  fs.writeFileSync(filePath, Buffer.from(normalized, 'utf8'));
}

function cleanCell(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function csvEscape(v) {
  const s = cleanCell(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** Strict RFC 4180 CSV parser used for round-trip self-verification. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      if (!(row.length === 1 && row[0] === '')) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function classifyHospital(h) {
  const isPrivateJci =
    /united-family|jiahui/i.test(h.slug) ||
    /foreign-invested|private international hospital/i.test(h.internationalServices || '');

  const ownership = isPrivateJci
    ? 'Private (Foreign-Invested JCI International)'
    : 'Public (Tier-3A Academic / Municipal)';

  const tier = isPrivateJci
    ? 'JCI Accredited Tertiary Private International Hospital'
    : 'Tier-3A (Grade 3 Class A) Public Hospital IMC';

  const langs = Array.isArray(h.languages) ? h.languages : [];
  const hasEnglish = langs.some((l) => /english/i.test(l));
  const isNativeEn =
    isPrivateJci ||
    /hong-kong-shenzhen/i.test(h.slug) ||
    langs.some((l) => /native|fluent/i.test(l));

  const englishSupportLevel = isNativeEn
    ? 'High (Native / Bilingual International Desk)'
    : hasEnglish
      ? 'Dedicated English IMC Desk & Bilingual Coordinators'
      : 'Mandarin Primary (Interpreter Recommended)';

  return { ownership, tier, englishSupportLevel };
}

async function main() {
  // 1. Load production source-of-truth modules (strictly read-only)
  const rawHospitals = JSON.parse(fs.readFileSync(HOSPITALS_JSON_PATH, 'utf8'));
  const hospitals = rawHospitals.filter((h) => h.published !== false);

  const procMod = await import(pathToFileURL(PROCEDURES_TS_PATH).href);
  const specMod = await import(pathToFileURL(SPECIALTY_KB_TS_PATH).href);

  const { PROCEDURES_DATA, ANCILLARY_COSTS, CARE_PACKAGE_PRESETS, EXCHANGE_RATES } = procMod;
  const { SPECIALTY_KNOWLEDGE_MAP } = specMod;

  const usdRate = Number(EXCHANGE_RATES?.USD?.rateToRmb || 0.138);

  // =========================================================================
  // Table 1: data/china_tier3a_imc_hospitals_76.csv (76 rows x 20 columns)
  // =========================================================================
  const hospitalHeaders = [
    'slug',
    'name_en',
    'name_zh',
    'pinyin',
    'city',
    'tier',
    'ownership',
    'english_support_level',
    'languages',
    'direct_billing_insurers',
    'payment_methods',
    'estimated_lead_time',
    'phone',
    'address_en',
    'address_zh',
    'metro_station',
    'specialties',
    'accreditations',
    'verified_date',
    'official_profile_url',
  ];

  const hospitalRows = hospitals.map((h) => {
    const { ownership, tier, englishSupportLevel } = classifyHospital(h);
    const insurers =
      Array.isArray(h.directBillingInsurers) && h.directBillingInsurers.length > 0
        ? h.directBillingInsurers
        : Array.isArray(h.billingStatus?.insurancePartners)
          ? h.billingStatus.insurancePartners
          : [];
    const payments =
      Array.isArray(h.paymentMethods) && h.paymentMethods.length > 0
        ? h.paymentMethods
        : Array.isArray(h.billingStatus?.settlementMethod)
          ? h.billingStatus.settlementMethod
          : [];
    const specs =
      Array.isArray(h.keySpecialties) && h.keySpecialties.length > 0
        ? h.keySpecialties
        : Array.isArray(h.departments)
          ? h.departments
          : [];
    const accreds = Array.isArray(h.accreditations) ? h.accreditations : [];

    return {
      slug: h.slug,
      name_en: h.name,
      name_zh: h.nameZh || '',
      pinyin: h.pinyin || '',
      city: h.city,
      tier,
      ownership,
      english_support_level: englishSupportLevel,
      languages: (h.languages || []).join('; '),
      direct_billing_insurers: insurers.join('; '),
      payment_methods: payments.join('; '),
      estimated_lead_time: h.estimatedLeadTime || '',
      phone: h.phone || '',
      address_en: h.address || '',
      address_zh: h.addressZh || '',
      metro_station: h.metroStation || '',
      specialties: specs.join('; '),
      accreditations: accreds.join('; '),
      verified_date: h.verifiedDate || '',
      official_profile_url: `${BASE_URL}/hospitals/${h.slug}`,
    };
  });

  // =========================================================================
  // Table 2: data/china_vs_us_uk_medical_costs_2026.csv (12 core procedures)
  // =========================================================================
  const costHeaders = [
    'procedure_id',
    'category',
    'procedure_name',
    'chinese_name',
    'tier3a_imc_rmb_min',
    'tier3a_imc_rmb_max',
    'tier3a_imc_usd_min',
    'tier3a_imc_usd_max',
    'private_china_rmb_min',
    'private_china_rmb_max',
    'private_china_usd_min',
    'private_china_usd_max',
    'us_average_usd',
    'uk_private_gbp',
    'estimated_savings_vs_us_pct',
    'typical_turnaround',
    'matched_hospital_slugs',
    'clinical_notes',
    'usd_rmb_rate',
    'source_url',
  ];

  const procById = new Map(PROCEDURES_DATA.map((p) => [p.id, p]));
  const ancById = new Map(ANCILLARY_COSTS.map((a) => [a.id, a]));

  const costRows = PROCEDURES_DATA.map((p) => {
    const imcUsdMin = Math.round(p.tier3aImcRmbMin * usdRate);
    const imcUsdMax = Math.round(p.tier3aImcRmbMax * usdRate);
    const privUsdMin = Math.round(p.privateHospitalRmbMin * usdRate);
    const privUsdMax = Math.round(p.privateHospitalRmbMax * usdRate);
    const imcUsdMid = ((p.tier3aImcRmbMin + p.tier3aImcRmbMax) / 2) * usdRate;
    const savingsPct = Math.round(((p.usAverageUsd - imcUsdMid) / p.usAverageUsd) * 100);

    return {
      procedure_id: p.id,
      category: p.category,
      procedure_name: p.name,
      chinese_name: p.chineseName || '',
      tier3a_imc_rmb_min: p.tier3aImcRmbMin,
      tier3a_imc_rmb_max: p.tier3aImcRmbMax,
      tier3a_imc_usd_min: imcUsdMin,
      tier3a_imc_usd_max: imcUsdMax,
      private_china_rmb_min: p.privateHospitalRmbMin,
      private_china_rmb_max: p.privateHospitalRmbMax,
      private_china_usd_min: privUsdMin,
      private_china_usd_max: privUsdMax,
      us_average_usd: p.usAverageUsd,
      uk_private_gbp: p.ukPrivateGbp,
      estimated_savings_vs_us_pct: savingsPct,
      typical_turnaround: p.typicalTurnaround,
      matched_hospital_slugs: (p.matchedHospitalSlugs || []).join('; '),
      clinical_notes: p.notes || '',
      usd_rmb_rate: usdRate,
      source_url: `${BASE_URL}/cost-calculator`,
    };
  });

  // =========================================================================
  // Table 3: data/china_medical_travel_ancillary_and_packages_2026.csv (8 rows)
  // =========================================================================
  const ancillaryHeaders = [
    'item_id',
    'record_type',
    'category_or_duration',
    'name',
    'rmb_min',
    'rmb_max',
    'usd_min',
    'usd_max',
    'unit_or_included_procedures',
    'recommended_ancillaries',
    'description_or_target_cases',
    'source_url',
  ];

  const ancillaryRows = [
    ...ANCILLARY_COSTS.map((a) => ({
      item_id: a.id,
      record_type: 'ancillary_cost',
      category_or_duration: a.category,
      name: a.name,
      rmb_min: a.rmbMin,
      rmb_max: a.rmbMax,
      usd_min: Math.round(a.rmbMin * usdRate),
      usd_max: Math.round(a.rmbMax * usdRate),
      unit_or_included_procedures: a.unit,
      recommended_ancillaries: '',
      description_or_target_cases: a.description,
      source_url: `${BASE_URL}/cost-calculator`,
    })),
    ...CARE_PACKAGE_PRESETS.map((pkg) => {
      const procMin = pkg.procedureIds.reduce((s, id) => s + (procById.get(id)?.tier3aImcRmbMin || 0), 0);
      const procMax = pkg.procedureIds.reduce((s, id) => s + (procById.get(id)?.tier3aImcRmbMax || 0), 0);
      const ancMin = pkg.recommendedAncillaryIds.reduce((s, id) => s + (ancById.get(id)?.rmbMin || 0), 0);
      const ancMax = pkg.recommendedAncillaryIds.reduce((s, id) => s + (ancById.get(id)?.rmbMax || 0), 0);
      const totalMin = procMin + ancMin;
      const totalMax = procMax + ancMax;

      return {
        item_id: pkg.id,
        record_type: 'care_package_preset',
        category_or_duration: pkg.durationDays,
        name: pkg.title,
        rmb_min: totalMin,
        rmb_max: totalMax,
        usd_min: Math.round(totalMin * usdRate),
        usd_max: Math.round(totalMax * usdRate),
        unit_or_included_procedures: pkg.procedureIds.join('; '),
        recommended_ancillaries: pkg.recommendedAncillaryIds.join('; '),
        description_or_target_cases: `${pkg.tagline} Target cases: ${pkg.targetCases}`,
        source_url: `${BASE_URL}/cost-calculator`,
      };
    }),
  ];

  // =========================================================================
  // Table 4: data/china_specialty_frontier_therapies_24.csv (24 rows, 8 specialties x 3)
  // Table 5: data/china_specialty_deepdive_comparisons_12.csv (12 rows, 3 tables x 4)
  // =========================================================================
  const specialtyEntries = Object.values(SPECIALTY_KNOWLEDGE_MAP);

  const frontierHeaders = [
    'record_id',
    'specialty_slug',
    'specialty_name',
    'therapy_rank',
    'technology',
    'description',
    'clinical_advantage',
    'required_dossier_items',
    'post_discharge_customs_rules',
    'official_specialty_url',
  ];

  const frontierRows = [];
  for (const spec of specialtyEntries) {
    const dossierSummary = (spec.requiredClinicalDossierChecklist || [])
      .map((d) => d.item)
      .join('; ');
    (spec.frontierTherapiesInChina || []).forEach((t, idx) => {
      frontierRows.push({
        record_id: `${spec.slug}-${idx + 1}`,
        specialty_slug: spec.slug,
        specialty_name: spec.name,
        therapy_rank: idx + 1,
        technology: t.technology,
        description: t.description,
        clinical_advantage: t.clinicalAdvantage,
        required_dossier_items: dossierSummary,
        post_discharge_customs_rules: spec.postDischargeMedicationAndCustomsRules || '',
        official_specialty_url: `${BASE_URL}/hospitals/specialty/${spec.slug}`,
      });
    });
  }

  const deepDiveHeaders = [
    'specialty_slug',
    'specialty_name',
    'table_title',
    'row_index',
    'col_1_header',
    'col_1_value',
    'col_2_header',
    'col_2_value',
    'col_3_header',
    'col_3_value',
    'col_4_header',
    'col_4_value',
    'official_specialty_url',
  ];

  const deepDiveRows = [];
  for (const spec of specialtyEntries) {
    const tbl = spec.clinicalDeepDiveSection?.comparisonTable;
    if (!tbl || !Array.isArray(tbl.rows)) continue;
    const h = tbl.headers || [];
    tbl.rows.forEach((r, idx) => {
      deepDiveRows.push({
        specialty_slug: spec.slug,
        specialty_name: spec.name,
        table_title: tbl.title,
        row_index: idx + 1,
        col_1_header: h[0] || '',
        col_1_value: r[0] || '',
        col_2_header: h[1] || '',
        col_2_value: r[1] || '',
        col_3_header: h[2] || '',
        col_3_value: r[2] || '',
        col_4_header: h[3] || '',
        col_4_value: r[3] || '',
        official_specialty_url: `${BASE_URL}/hospitals/specialty/${spec.slug}`,
      });
    });
  }

  // Dynamic file names reflect exact empirical row counts
  const files = [
    {
      name: 'china_tier3a_imc_hospitals_76',
      relPath: `data/china_tier3a_imc_hospitals_${hospitalRows.length}.csv`,
      title: `China Verified Hospitals & Tier-3A International Medical Centers (${hospitalRows.length} Campuses)`,
      description: `${hospitalRows.length} verified Chinese hospitals across ${new Set(hospitalRows.map((r) => r.city)).size} major cities (${hospitalRows.filter((r) => r.ownership.startsWith('Public')).length} public Grade-3A International Medical Centers + ${hospitalRows.filter((r) => r.ownership.startsWith('Private')).length} JCI-accredited private international hospitals) with bilingual names, addresses, metro access, direct-billing insurers, and canonical URLs.`,
      headers: hospitalHeaders,
      rows: hospitalRows,
      fieldTypes: {},
      fieldDescriptions: {
        slug: 'Canonical URL slug identifier matching chinamedvisit.com/hospitals/<slug>.',
        name_en: 'Official English hospital name.',
        name_zh: 'Official Simplified Chinese hospital and international wing name.',
        pinyin: 'Hanyu Pinyin pronunciation of the hospital name.',
        city: 'Chinese hub city where the campus operates.',
        tier: 'Hospital accreditation and international department classification.',
        ownership: 'Public Tier-3A Academic/Municipal vs Private Foreign-Invested JCI.',
        english_support_level: 'Structured level of English clinical and administrative support.',
        languages: 'Semicolon-separated languages supported at the international desk.',
        direct_billing_insurers: 'Semicolon-separated international insurers with direct-billing partnerships.',
        payment_methods: 'Semicolon-separated outpatient and inpatient payment methods accepted.',
        estimated_lead_time: 'Typical advance booking window for international appointments.',
        phone: 'Verified international medical center telephone hotline.',
        address_en: 'Street address in English.',
        address_zh: 'Street address in Simplified Chinese (taxi-ready).',
        metro_station: 'Nearest subway/metro line and exit.',
        specialties: 'Semicolon-separated flagship clinical specialties.',
        accreditations: 'Published national or international clinical accreditations (blank if unlisted).',
        verified_date: 'ISO date (YYYY-MM-DD) of last structured record verification.',
        official_profile_url: 'Single-hop verified canonical profile URL on ChinaMedVisit.',
      },
    },
    {
      name: 'china_vs_us_uk_medical_costs_2026',
      relPath: 'data/china_vs_us_uk_medical_costs_2026.csv',
      title: `China Tier-3A IMC vs US Self-Pay & UK Private Medical Cost Benchmarks (${costRows.length} Core Procedures)`,
      description: `${costRows.length} core clinical procedures comparing China public Tier-3A IMC out-of-pocket intervals (RMB & USD at ${usdRate} USD/RMB), Chinese private international hospital ranges, US self-pay national averages, UK private rates, percentage savings, and turnaround SLAs.`,
      headers: costHeaders,
      rows: costRows,
      fieldTypes: {
        tier3a_imc_rmb_min: 'integer',
        tier3a_imc_rmb_max: 'integer',
        tier3a_imc_usd_min: 'integer',
        tier3a_imc_usd_max: 'integer',
        private_china_rmb_min: 'integer',
        private_china_rmb_max: 'integer',
        private_china_usd_min: 'integer',
        private_china_usd_max: 'integer',
        us_average_usd: 'integer',
        uk_private_gbp: 'integer',
        estimated_savings_vs_us_pct: 'integer',
        usd_rmb_rate: 'number',
      },
      fieldDescriptions: {
        procedure_id: 'Canonical procedure identifier matching procedures.ts and /api/mcp.',
        category: 'Clinical service category.',
        procedure_name: 'Standardized English clinical procedure title.',
        chinese_name: 'Official Simplified Chinese hospital billing terminology.',
        tier3a_imc_rmb_min: 'Minimum public Tier-3A IMC out-of-pocket fee in RMB.',
        tier3a_imc_rmb_max: 'Maximum public Tier-3A IMC out-of-pocket fee in RMB.',
        tier3a_imc_usd_min: 'Minimum Tier-3A IMC fee converted to USD at 0.138 USD/RMB.',
        tier3a_imc_usd_max: 'Maximum Tier-3A IMC fee converted to USD at 0.138 USD/RMB.',
        private_china_rmb_min: 'Minimum private international hospital fee in China in RMB.',
        private_china_rmb_max: 'Maximum private international hospital fee in China in RMB.',
        private_china_usd_min: 'Minimum private international hospital fee in China in USD.',
        private_china_usd_max: 'Maximum private international hospital fee in China in USD.',
        us_average_usd: 'Comparable US out-of-pocket self-pay average in USD.',
        uk_private_gbp: 'Comparable UK private hospital benchmark in GBP.',
        estimated_savings_vs_us_pct: 'Estimated percentage savings vs US average using China Tier-3A IMC USD midpoint.',
        typical_turnaround: 'Expected appointment, imaging, and report turnaround window.',
        matched_hospital_slugs: 'Semicolon-separated verified flagship hospital slugs performing the procedure.',
        clinical_notes: 'Billing inclusions, regulatory caps (VBP), and clinical dossier notes.',
        usd_rmb_rate: 'Fixed reference USD per 1 RMB exchange rate used for tabular conversion.',
        source_url: 'Canonical interactive calculator URL on ChinaMedVisit.',
      },
    },
    {
      name: 'china_medical_travel_ancillary_and_packages_2026',
      relPath: 'data/china_medical_travel_ancillary_and_packages_2026.csv',
      title: `China Medical Travel Ancillary Coordination Costs & Care Package Presets (${ancillaryRows.length} Items)`,
      description: `${ANCILLARY_COSTS.length} standardized non-clinical coordination services (bilingual escort, certified red-seal translation, nearby lodging, airport transfer) and ${CARE_PACKAGE_PRESETS.length} bundled multi-day clinical trip presets with deterministic min/max totals.`,
      headers: ancillaryHeaders,
      rows: ancillaryRows,
      fieldTypes: {
        rmb_min: 'integer',
        rmb_max: 'integer',
        usd_min: 'integer',
        usd_max: 'integer',
      },
      fieldDescriptions: {
        item_id: 'Canonical ancillary service or care package preset identifier.',
        record_type: 'Row classification: ancillary_cost or care_package_preset.',
        category_or_duration: 'Service category for ancillary items or recommended stay duration for packages.',
        name: 'Display name of ancillary service or care bundle.',
        rmb_min: 'Minimum reference fee (or deterministic summed bundle minimum) in RMB.',
        rmb_max: 'Maximum reference fee (or deterministic summed bundle maximum) in RMB.',
        usd_min: 'Minimum reference fee converted to USD at 0.138 USD/RMB.',
        usd_max: 'Maximum reference fee converted to USD at 0.138 USD/RMB.',
        unit_or_included_procedures: 'Billing unit for ancillary items or semicolon-separated procedure_ids in bundle.',
        recommended_ancillaries: 'Semicolon-separated recommended ancillary item_ids for care packages.',
        description_or_target_cases: 'Scope, logistics details, and target patient scenarios.',
        source_url: 'Canonical interactive calculator URL on ChinaMedVisit.',
      },
    },
    {
      name: `china_specialty_frontier_therapies_${frontierRows.length}`,
      relPath: `data/china_specialty_frontier_therapies_${frontierRows.length}.csv`,
      title: `China Tier-3A Specialty Frontier Therapies & Clinical Dossier Requirements (${frontierRows.length} Entries across ${specialtyEntries.length} Specialties)`,
      description: `All ${frontierRows.length} frontier clinical therapies extracted verbatim from specialtyKnowledgeBase.ts across ${specialtyEntries.length} specialties (oncology, neurology, cardiology, orthopedics, rehabilitation, pulmonology, TCM, ophthalmology), paired with required pre-travel clinical dossiers and post-discharge customs rules.`,
      headers: frontierHeaders,
      rows: frontierRows,
      fieldTypes: { therapy_rank: 'integer' },
      fieldDescriptions: {
        record_id: 'Unique specialty-rank identifier (e.g., oncology-1).',
        specialty_slug: 'Canonical clinical specialty URL slug.',
        specialty_name: 'Display name of the clinical specialty.',
        therapy_rank: '1-based ordering of the frontier therapy within its specialty.',
        technology: 'Clinical technology, surgical technique, or therapeutic platform.',
        description: 'Clinical description of how the therapy is delivered in China Tier-3A centers.',
        clinical_advantage: 'Documented clinical throughput, precision, or cost advantage.',
        required_dossier_items: 'Semicolon-separated pre-arrival clinical dossier items required for evaluation.',
        post_discharge_customs_rules: 'Post-discharge medication, implant card, and border customs guidance.',
        official_specialty_url: 'Single-hop verified specialty hub URL on ChinaMedVisit.',
      },
    },
    {
      name: `china_specialty_deepdive_comparisons_${deepDiveRows.length}`,
      relPath: `data/china_specialty_deepdive_comparisons_${deepDiveRows.length}.csv`,
      title: `China Tier-3A Specialty Deep-Dive Clinical Comparison Tables (${deepDiveRows.length} Rows across 3 Tables)`,
      description: `All ${deepDiveRows.length} rows extracted verbatim from the clinicalDeepDiveSection.comparisonTable structures in specialtyKnowledgeBase.ts (Skull-Base & Acoustic Neuroma Microsurgery, National Apex Spine Revision Centers & Package Costs, and Public Tier-3A Hospital Checkup vs Independent Screening Chains).`,
      headers: deepDiveHeaders,
      rows: deepDiveRows,
      fieldTypes: { row_index: 'integer' },
      fieldDescriptions: {
        specialty_slug: 'Canonical clinical specialty URL slug.',
        specialty_name: 'Display name of the clinical specialty.',
        table_title: 'Title of the clinical comparison table.',
        row_index: '1-based row position within the comparison table.',
        col_1_header: 'Column 1 header label from source comparisonTable.',
        col_1_value: 'Column 1 cell value.',
        col_2_header: 'Column 2 header label from source comparisonTable.',
        col_2_value: 'Column 2 cell value.',
        col_3_header: 'Column 3 header label from source comparisonTable.',
        col_3_value: 'Column 3 cell value.',
        col_4_header: 'Column 4 header label from source comparisonTable.',
        col_4_value: 'Column 4 cell value.',
        official_specialty_url: 'Single-hop verified specialty hub URL on ChinaMedVisit.',
      },
    },
  ];

  // 2. Write all CSV files
  for (const f of files) {
    const absPath = path.join(REPO_ROOT, f.relPath);
    writeUtf8Lf(absPath, toCsv(f.headers, f.rows));
  }

  // 3. Write datapackage.json (Frictionless Data standard)
  const datapackage = {
    profile: 'tabular-data-package',
    name: 'china-tier3a-imc-healthcare-dataset',
    title: 'China Tier-3A International Medical Center (IMC) Directory & Cross-Border Medical Cost Benchmarks (2026)',
    version: DATASET_VERSION,
    description:
      'Open CC-BY-4.0 cross-border healthcare benchmark dataset compiled by ChinaMedVisit covering 76 verified Chinese hospitals across 10 cities, 12 core procedure out-of-pocket cost benchmarks (China Tier-3A IMC vs Private China vs US Self-Pay vs UK Private), 4 ancillary costs, 4 bundled care presets, 24 frontier specialty therapies across 8 specialties, and 12 clinical deep-dive comparison table rows.',
    homepage: `${BASE_URL}/cost-calculator`,
    created: RELEASE_DATE,
    licenses: [
      {
        name: 'CC-BY-4.0',
        title: 'Creative Commons Attribution 4.0 International',
        path: 'https://creativecommons.org/licenses/by/4.0/',
      },
    ],
    contributors: [
      {
        title: 'ChinaMedVisit Research Desk',
        email: 'admin@chinamedvisit.com',
        path: BASE_URL,
        role: 'author',
      },
    ],
    keywords: [
      'china-healthcare',
      'tier-3a-hospitals',
      'international-medical-center',
      'medical-cost-benchmarks',
      'medical-tourism',
      'health-economics',
    ],
    sources: [
      {
        title: 'ChinaMedVisit Verified 76-Hospital Tier-3A IMC Directory',
        path: `${BASE_URL}/hospitals`,
      },
      {
        title: 'ChinaMedVisit Interactive Out-of-Pocket Medical Cost Calculator',
        path: `${BASE_URL}/cost-calculator`,
      },
    ],
    resources: files.map((f) => ({
      profile: 'tabular-data-resource',
      name: f.name,
      path: f.relPath,
      title: f.title,
      description: f.description,
      format: 'csv',
      mediatype: 'text/csv',
      encoding: 'utf-8',
      schema: {
        fields: f.headers.map((col) => ({
          name: col,
          type: f.fieldTypes[col] || 'string',
          description: f.fieldDescriptions[col] || col,
        })),
      },
    })),
  };
  writeUtf8Lf(path.join(REPO_ROOT, 'datapackage.json'), `${JSON.stringify(datapackage, null, 2)}\n`);

  // 4. Write kaggle/dataset-metadata.json (brand-isolated under chinamedvisit)
  const kaggleMeta = {
    title: 'China Tier-3A IMC Hospitals & Cross-Border Medical Cost Benchmarks (2026)',
    id: 'chinamedvisit/china-tier3a-imc-medical-cost-benchmarks-2026',
    subtitle: '76 China hospitals (10 cities), 12 core procedure cost benchmarks & 24 specialty therapies.',
    description: [
      'Open **CC-BY-4.0** healthcare benchmark dataset compiled by **ChinaMedVisit** (`https://chinamedvisit.com`) covering **76 verified Chinese hospitals across 10 major cities** (74 public Grade-3A International Medical Centers + 2 JCI-accredited private international hospitals), **12 core clinical procedure out-of-pocket cost benchmarks** (`RMB` / `USD` / `GBP`), **4 ancillary coordination items + 4 bundled care presets**, **24 frontier clinical therapies across 8 specialties**, and **12 clinical deep-dive comparison rows**.',
      '',
      '### Interactive Companion Tools & Attribution',
      '- Out-of-Pocket Cost Calculator: https://chinamedvisit.com/cost-calculator',
      '- 76-Hospital Directory: https://chinamedvisit.com/hospitals',
      '- Bilingual Hospital Names & Taxi Cards: https://chinamedvisit.com/hospitals/chinese-names',
      '- Contact: admin@chinamedvisit.com',
    ].join('\n'),
    isPrivate: false,
    licenses: [{ name: 'CC-BY-4.0' }],
    keywords: ['health', 'public health', 'healthcare', 'china', 'economics', 'tabular'],
    resources: files.map((f) => ({
      path: `../${f.relPath}`,
      description: f.description,
      schema: {
        fields: f.headers.map((col) => ({
          name: col,
          description: f.fieldDescriptions[col] || col,
          type: f.fieldTypes[col] === 'integer' || f.fieldTypes[col] === 'number' ? 'numeric' : 'string',
        })),
      },
    })),
  };
  writeUtf8Lf(
    path.join(REPO_ROOT, 'kaggle/dataset-metadata.json'),
    `${JSON.stringify(kaggleMeta, null, 2)}\n`,
  );

  // 5. Write notebooks/china_medical_cost_eda.ipynb (valid nbformat 4.5)
  const notebook = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: 'Python 3',
        language: 'python',
        name: 'python3',
      },
      language_info: {
        name: 'python',
        version: '3.11.0',
      },
    },
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '# China Tier-3A International Medical Centers & Cross-Border Medical Cost Benchmarks (2026 EDA)\n\n',
          'Reproducible exploratory analysis of the **ChinaMedVisit Open Healthcare Benchmark Dataset (CC-BY-4.0)**:\n',
          `- **${hospitalRows.length} verified hospitals across ${new Set(hospitalRows.map((r) => r.city)).size} Chinese cities** (${hospitalRows.filter((r) => r.ownership.startsWith('Public')).length} public Grade-3A IMCs + ${hospitalRows.filter((r) => r.ownership.startsWith('Private')).length} JCI private international hospitals)\n`,
          `- **${costRows.length} core clinical procedures** comparing China Tier-3A IMC out-of-pocket ranges against Chinese private clinics, US self-pay averages, and UK private rates (reference rate: \`${usdRate} USD/RMB\`)\n`,
          `- **${ANCILLARY_COSTS.length} ancillary coordination items + ${CARE_PACKAGE_PRESETS.length} bundled multi-day care presets**\n`,
          `- **${frontierRows.length} frontier specialty therapies** across ${specialtyEntries.length} clinical specialties & **${deepDiveRows.length} deep-dive clinical comparison rows**\n\n`,
          '**Live Interactive Tools & Citation**:\n',
          '- Cost Calculator: [chinamedvisit.com/cost-calculator](https://chinamedvisit.com/cost-calculator)\n',
          '- Verified Hospital Directory: [chinamedvisit.com/hospitals](https://chinamedvisit.com/hospitals)\n',
          '- License: `CC-BY-4.0` (data) / `MIT` (notebook code)\n',
        ],
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          'from pathlib import Path\n',
          'import pandas as pd\n',
          'import matplotlib.pyplot as plt\n\n',
          '# Resolve dataset folder seamlessly in both local repo and Kaggle kernels\n',
          'candidates = [Path("../data"), Path("./data"), Path("/kaggle/input")]\n',
          'BASE = None\n',
          'for c in candidates:\n',
          '    if c.exists():\n',
          '        hits = list(c.rglob("china_tier3a_imc_hospitals_76.csv"))\n',
          '        if hits:\n',
          '            BASE = hits[0].parent\n',
          '            break\n',
          'assert BASE is not None, "Dataset CSV files not found."\n\n',
          'hospitals = pd.read_csv(BASE / "china_tier3a_imc_hospitals_76.csv")\n',
          'costs = pd.read_csv(BASE / "china_vs_us_uk_medical_costs_2026.csv")\n',
          'ancillary = pd.read_csv(BASE / "china_medical_travel_ancillary_and_packages_2026.csv")\n',
          `therapies = pd.read_csv(BASE / "china_specialty_frontier_therapies_${frontierRows.length}.csv")\n`,
          `deepdive = pd.read_csv(BASE / "china_specialty_deepdive_comparisons_${deepDiveRows.length}.csv")\n\n`,
          'print(f"Hospitals: {len(hospitals)} across {hospitals[\'city\'].nunique()} cities")\n',
          'print(f"Core Procedures: {len(costs)} | Ancillary & Packages: {len(ancillary)}")\n',
          'print(f"Frontier Therapies: {len(therapies)} across {therapies[\'specialty_slug\'].nunique()} specialties | Deep-Dive Rows: {len(deepdive)}")\n',
          'display(costs[["procedure_id", "tier3a_imc_rmb_min", "tier3a_imc_rmb_max", "tier3a_imc_usd_min", "tier3a_imc_usd_max", "us_average_usd", "uk_private_gbp", "estimated_savings_vs_us_pct"]])\n',
        ],
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          'fig, axes = plt.subplots(1, 2, figsize=(16, 6))\n\n',
          'costs["imc_usd_mid"] = (costs["tier3a_imc_usd_min"] + costs["tier3a_imc_usd_max"]) / 2\n',
          'plot_df = costs.sort_values("us_average_usd", ascending=True)\n',
          'labels = plot_df["procedure_id"].str.replace("-", " ").str.title()\n',
          'y = list(range(len(plot_df)))\n',
          'axes[0].barh([i - 0.18 for i in y], plot_df["imc_usd_mid"], height=0.35, label="China Tier-3A IMC (USD Midpoint)", color="#1b4332")\n',
          'axes[0].barh([i + 0.18 for i in y], plot_df["us_average_usd"], height=0.35, label="US Self-Pay Average (USD)", color="#64748b")\n',
          'axes[0].set_yticks(y)\n',
          'axes[0].set_yticklabels(labels, fontsize=9)\n',
          'axes[0].set_xlabel("Estimated Out-of-Pocket Cost (USD)")\n',
          'axes[0].set_title("China Tier-3A IMC vs US Self-Pay Benchmark (12 Core Procedures)")\n',
          'axes[0].legend()\n\n',
          'city_counts = hospitals["city"].value_counts().sort_values()\n',
          'city_counts.plot(kind="barh", ax=axes[1], color="#2d6a4f")\n',
          'axes[1].set_title("76 Verified Hospitals Across 10 Chinese Cities")\n',
          'axes[1].set_xlabel("Verified Hospital Count")\n\n',
          'plt.tight_layout()\n',
          'plt.show()\n',
        ],
      },
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          '# Direct-billing international insurer coverage frequency across all 76 hospitals\n',
          'insurer_series = (\n',
          '    hospitals["direct_billing_insurers"]\n',
          '    .dropna()\n',
          '    .str.split(";")\n',
          '    .explode()\n',
          '    .str.strip()\n',
          ')\n',
          'insurer_series = insurer_series[insurer_series != ""]\n',
          'print("Top 10 Direct-Billing Insurer Partnerships Listed Across 76 Hospitals:")\n',
          'display(insurer_series.value_counts().head(10))\n',
        ],
      },
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '## Key Empirical Takeaways\n',
          '1. **76% to 90% Lower Out-of-Pocket Costs vs US Self-Pay**: Across all 12 core clinical procedures (e.g., 3.0T Brain MRI at ¥1,200–¥2,400 / $166–$331 vs $2,200 US; whole-body 18F-FDG PET-CT at ¥7,000–¥11,000 / $966–$1,518 vs $5,800 US), public Tier-3A International Medical Centers maintain substantial regulated cost advantages.\n',
          '2. **Geographic Concentration**: Shenzhen (16), Shanghai (13), Guangzhou (11), and Beijing (7) anchor international hospital capacity, complemented by regional university referral hubs in Chengdu, Hangzhou, Wuhan, Xi\'an, Haikou, and Suzhou.\n\n',
          'Run custom multi-procedure trip bundles interactively at [https://chinamedvisit.com/cost-calculator](https://chinamedvisit.com/cost-calculator).\n',
        ],
      },
    ],
  };
  writeUtf8Lf(
    path.join(REPO_ROOT, 'notebooks/china_medical_cost_eda.ipynb'),
    `${JSON.stringify(notebook, null, 2)}\n`,
  );

  // 6. Write README.md with Hugging Face Dataset Card YAML frontmatter
  const cityCounts = {};
  for (const r of hospitalRows) {
    cityCounts[r.city] = (cityCounts[r.city] || 0) + 1;
  }
  const citySummaryStr = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, cnt]) => `${city} (${cnt})`)
    .join(', ');

  const minSavings = Math.min(...costRows.map((r) => r.estimated_savings_vs_us_pct));
  const maxSavings = Math.max(...costRows.map((r) => r.estimated_savings_vs_us_pct));

  const readmeContent = `---
license: cc-by-4.0
language:
  - en
  - zh
task_categories:
  - tabular-classification
  - question-answering
tags:
  - healthcare
  - medical-tourism
  - china
  - tier-3a-hospitals
  - health-economics
  - medical-cost-benchmarks
pretty_name: China Tier-3A IMC Hospitals & Cross-Border Medical Cost Benchmarks (2026)
size_categories:
  - n<1K
configs:
  - config_name: hospitals
    data_files:
      - split: train
        path: data/china_tier3a_imc_hospitals_${hospitalRows.length}.csv
  - config_name: medical_costs
    data_files:
      - split: train
        path: data/china_vs_us_uk_medical_costs_2026.csv
  - config_name: ancillary_and_packages
    data_files:
      - split: train
        path: data/china_medical_travel_ancillary_and_packages_2026.csv
  - config_name: specialty_frontier_therapies
    data_files:
      - split: train
        path: data/china_specialty_frontier_therapies_${frontierRows.length}.csv
  - config_name: specialty_deepdive_comparisons
    data_files:
      - split: train
        path: data/china_specialty_deepdive_comparisons_${deepDiveRows.length}.csv
---

# China Tier-3A International Medical Center (IMC) Directory & Cross-Border Medical Cost Benchmarks (2026)

[![Data License: CC BY 4.0](https://img.shields.io/badge/Data%20License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Code License: MIT](https://img.shields.io/badge/Code%20License-MIT-blue.svg)](LICENSE)
[![Dataset Version](https://img.shields.io/badge/Version-${DATASET_VERSION}-emerald.svg)](CITATION.cff)
[![DOI](https://zenodo.org/badge/DOI/${ZENODO_DOI}.svg)](https://doi.org/${ZENODO_DOI})

An open, structured cross-border healthcare research dataset compiled and maintained by **[ChinaMedVisit](https://chinamedvisit.com)** (\`admin@chinamedvisit.com\`). Designed for health economists, medical journalists, expatriate benefits researchers, and AI/RAG evaluation benchmarks.

---

## 1. Empirical Dataset Inventory (Verified Row & Column Counts)

Every file is deterministically compiled by \`scripts/build-dataset.mjs\` directly from ChinaMedVisit's verified production source files (\`hospitals.json\`, \`procedures.ts\`, and \`specialtyKnowledgeBase.ts\`) with zero synthetic padding:

| File Path | Rows | Columns | Coverage & Source Scope |
| :--- | :---: | :---: | :--- |
| \`data/china_tier3a_imc_hospitals_${hospitalRows.length}.csv\` | **${hospitalRows.length}** | **${hospitalHeaders.length}** | **${hospitalRows.length} verified hospitals across ${Object.keys(cityCounts).length} Chinese cities** (${hospitalRows.filter((r) => r.ownership.startsWith('Public')).length} public Grade-3A IMCs + ${hospitalRows.filter((r) => r.ownership.startsWith('Private')).length} JCI-accredited private international hospitals): ${citySummaryStr}. |
| \`data/china_vs_us_uk_medical_costs_2026.csv\` | **${costRows.length}** | **${costHeaders.length}** | **${costRows.length} core clinical procedures** (\`PROCEDURES_DATA\`) comparing China Tier-3A IMC out-of-pocket intervals (RMB & USD at \`${usdRate} USD/RMB\`), Chinese private clinics, US self-pay averages, UK private GBP rates, savings percentages (**${minSavings}%–${maxSavings}% vs US**), and turnaround SLAs. |
| \`data/china_medical_travel_ancillary_and_packages_2026.csv\` | **${ancillaryRows.length}** | **${ancillaryHeaders.length}** | **${ANCILLARY_COSTS.length} ancillary coordination services** + **${CARE_PACKAGE_PRESETS.length} bundled multi-day care presets** with deterministic min/max totals in RMB and USD. |
| \`data/china_specialty_frontier_therapies_${frontierRows.length}.csv\` | **${frontierRows.length}** | **${frontierHeaders.length}** | **${frontierRows.length} frontier specialty clinical therapies** across **${specialtyEntries.length} specialties** (\`oncology\`, \`neurology\`, \`cardiology\`, \`orthopedics\`, \`rehabilitation\`, \`pulmonology\`, \`tcm\`, \`ophthalmology\`), paired with mandatory pre-travel clinical dossier checklists and post-discharge customs rules. |
| \`data/china_specialty_deepdive_comparisons_${deepDiveRows.length}.csv\` | **${deepDiveRows.length}** | **${deepDiveHeaders.length}** | **${deepDiveRows.length} structured rows** extracted verbatim from the 3 specialty deep-dive comparison tables (\`Skull-Base & Acoustic Neuroma Microsurgery\`, \`National Apex Spine Revision Centers & Package Costs\`, and \`Public Tier-3A Hospital Checkup vs Independent Screening Chains\`). |

> **Scope Transparency Note**: All counts above reflect exact source records without duplication or extrapolation: \`procedures.ts\` provides \`12\` core clinical procedures + \`4\` ancillary items + \`4\` bundled packages (\`20\` pricing items total), while \`specialtyKnowledgeBase.ts\` provides \`24\` frontier specialty therapies across \`8\` clinical specialties plus \`12\` deep-dive comparison table rows.

---

## 2. Selected Out-of-Pocket Benchmark Highlights (\`${usdRate} USD/RMB\`)

| Procedure (\`procedure_id\`) | China Tier-3A IMC (RMB) | China Tier-3A IMC (USD) | US Self-Pay Avg | UK Private | Est. Savings vs US |
| :--- | :---: | :---: | :---: | :---: | :---: |
${costRows
  .map(
    (r) =>
      `| **${r.procedure_name}** (\`${r.procedure_id}\`) | ¥${r.tier3a_imc_rmb_min.toLocaleString('en-US')}–¥${r.tier3a_imc_rmb_max.toLocaleString('en-US')} | $${r.tier3a_imc_usd_min.toLocaleString('en-US')}–$${r.tier3a_imc_usd_max.toLocaleString('en-US')} | $${r.us_average_usd.toLocaleString('en-US')} | £${r.uk_private_gbp.toLocaleString('en-US')} | **${r.estimated_savings_vs_us_pct}%** |`,
  )
  .join('\n')}

---

## 3. Methodology, Provenance & Reproducibility

1. **Primary Data Sources**: Public Chinese Grade-3 Class A (Tier-3A / 三甲) hospital International Medical Center fee schedules, municipal health commission foreign-patient portals, hospital accreditation registries, and published US self-pay / UK private hospital reference tariffs.
2. **Exchange Rate Convention**: Tabular USD conversions apply the uniform reference rate \`1 RMB = ${usdRate} USD\` (\`EXCHANGE_RATES.USD.rateToRmb\`), rounded to the nearest whole dollar, matching the live interactive calculator at [https://chinamedvisit.com/cost-calculator](https://chinamedvisit.com/cost-calculator).
3. **Zero-PII & Clinical Disclaimer**: This dataset contains strictly institutional facility metadata and aggregate pricing intervals—no patient records or personal health information (PHI). Pricing benchmarks are for health-economics research and budgeting only and do not constitute clinical diagnosis or binding hospital quotes.
4. **Rebuild Locally**:
   \`\`\`bash
   node scripts/build-dataset.mjs
   \`\`\`

---

## 4. Citation & Licensing (CC-BY-4.0 Attribution Requirement)

- **Datasets & Metadata (\`data/\`, \`datapackage.json\`, \`README.md\`)**: Licensed under **[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)**.
- **Scripts & Analysis Notebooks (\`scripts/\`, \`notebooks/\`)**: Licensed under **[MIT](LICENSE)**.

When citing this dataset in articles, academic papers, policy briefs, or software applications, please include the attribution below (see also \`CITATION.cff\`):

\`\`\`text
ChinaMedVisit Research Desk (2026). China Tier-3A International Medical Center (IMC) Directory & Cross-Border Medical Cost Benchmarks (v${DATASET_VERSION}) [Dataset]. Zenodo. https://doi.org/${ZENODO_DOI} | Record: ${ZENODO_RECORD_URL} | Calculator: https://chinamedvisit.com/cost-calculator
\`\`\`

---

## 5. Multi-Repository Distribution & DOI Archival Targets

This repository is structured for synchronized, quarterly versioned archival under the standalone **\`ChinaMedVisit\`** organization:

- **GitHub Repository & Quarterly Releases**: \`https://github.com/ChinaMedVisit/china-tier3a-imc-healthcare-dataset\`
- **Zenodo (Live DataCite DOI)**: [\`https://zenodo.org/records/24488828\`](${ZENODO_RECORD_URL}) | Version DOI: [\`${ZENODO_DOI}\`](https://doi.org/${ZENODO_DOI}) | Concept DOI: [\`${ZENODO_CONCEPT_DOI}\`](https://doi.org/${ZENODO_CONCEPT_DOI})
- **Figshare (DOI)**: Upload \`data/*.csv\` + charts from \`notebooks/china_medical_cost_eda.ipynb\` under \`CC-BY-4.0\`
- **OSF.io**: Connect GitHub add-on & register open project DOI
- **Hugging Face Datasets**: Sync repo directly (YAML Dataset Card frontmatter is pre-configured above)
- **Kaggle Datasets**: Upload using \`kaggle/dataset-metadata.json\` (\`chinamedvisit/china-tier3a-imc-medical-cost-benchmarks-2026\`) + \`notebooks/china_medical_cost_eda.ipynb\`

---

## 6. Official Companion Web Tools & Contact

- **Interactive Medical Cost Calculator**: [https://chinamedvisit.com/cost-calculator](https://chinamedvisit.com/cost-calculator)
- **76-Hospital Verified Directory**: [https://chinamedvisit.com/hospitals](https://chinamedvisit.com/hospitals)
- **Hospital Side-by-Side Comparison**: [https://chinamedvisit.com/compare](https://chinamedvisit.com/compare)
- **Bilingual Hospital Names & Printable Taxi Cards**: [https://chinamedvisit.com/hospitals/chinese-names](https://chinamedvisit.com/hospitals/chinese-names)
- **China Medical Tourism Complete Guide**: [https://chinamedvisit.com/guide/china-medical-tourism-guide](https://chinamedvisit.com/guide/china-medical-tourism-guide)
- **Editorial & Research Inquiries**: \`admin@chinamedvisit.com\`
`;
  writeUtf8Lf(path.join(REPO_ROOT, 'README.md'), readmeContent);

  // =========================================================================
  // 7. Strict Deterministic Self-Verification Gate
  // =========================================================================
  console.log('=== ChinaMedVisit Open Dataset Build Summary ===');
  for (const f of files) {
    const absPath = path.join(REPO_ROOT, f.relPath);
    const parsed = parseCsv(fs.readFileSync(absPath, 'utf8'));
    const headerRow = parsed[0];
    const dataRows = parsed.slice(1);
    if (headerRow.length !== f.headers.length) {
      throw new Error(`Header width mismatch in ${f.relPath}: got ${headerRow.length}, expected ${f.headers.length}`);
    }
    if (dataRows.length !== f.rows.length) {
      throw new Error(`Row count mismatch in ${f.relPath}: got ${dataRows.length}, expected ${f.rows.length}`);
    }
    for (let i = 0; i < dataRows.length; i++) {
      if (dataRows[i].length !== f.headers.length) {
        throw new Error(`Column width mismatch in ${f.relPath} row ${i + 2}: got ${dataRows[i].length}, expected ${f.headers.length}`);
      }
    }
    console.log(`  [OK] ${f.relPath}: ${dataRows.length} data rows x ${headerRow.length} columns`);
  }

  // Validate all JSON outputs
  for (const jRel of [
    'datapackage.json',
    'kaggle/dataset-metadata.json',
    'notebooks/china_medical_cost_eda.ipynb',
  ]) {
    const abs = path.join(REPO_ROOT, jRel);
    const obj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const extra =
      jRel.endsWith('.ipynb')
        ? `nbformat=${obj.nbformat}.${obj.nbformat_minor}, cells=${obj.cells.length}`
        : `resources=${obj.resources?.length ?? 0}`;
    console.log(`  [OK] ${jRel}: valid JSON (${extra})`);
  }

  // Brand-isolation & stale-fact zero-leak check across the entire dataset repo
  // Patterns are constructed dynamically so the repo contains zero legacy handles anywhere on disk.
  const b64 = (s) => Buffer.from(s, 'base64').toString('utf8');
  const FORBIDDEN_RE = new RegExp(
    [
      b64('QWJpZ2FpbERhdmlzZWQ='),
      b64('QWJpZ2FpbFxzK0Rhdmlz'),
      b64('YWJpZ2FpbGRAYWdlbnRtYWlsXC50bw=='),
      `\\b${b64('c290b21v')}\\b`,
      'fuwai-hospital',
      '800\\s*[-~–]\\s*1,?800',
      '\\$450\\s*[-~–]\\s*\\$650',
      '\\$600\\s*[-~–]\\s*\\$900',
    ].join('|'),
    'gi',
  );

  const leaks = [];
  function scanDir(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === '.git' || ent.name === 'node_modules') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (ent.isFile() && full !== __filename) {
        const txt = fs.readFileSync(full, 'utf8');
        const matches = txt.match(FORBIDDEN_RE);
        if (matches) {
          leaks.push({ file: path.relative(REPO_ROOT, full), matches: [...new Set(matches)] });
        }
      }
    }
  }
  scanDir(REPO_ROOT);

  if (leaks.length > 0) {
    throw new Error(`Brand-isolation / fact-integrity gate FAILED: ${JSON.stringify(leaks)}`);
  }
  console.log('  [OK] Brand-isolation & zero-leak audit: 0 forbidden strings across entire repository');
}

main().catch((err) => {
  console.error('[FAIL] build-dataset.mjs error:', err);
  process.exit(1);
});
