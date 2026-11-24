---
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
    default: true
    data_files:
      - split: train
        path: data/china_tier3a_imc_hospitals_76.csv
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
        path: data/china_specialty_frontier_therapies_24.csv
  - config_name: specialty_deepdive_comparisons
    data_files:
      - split: train
        path: data/china_specialty_deepdive_comparisons_12.csv
---

# China Tier-3A International Medical Center (IMC) Directory & Cross-Border Medical Cost Benchmarks (2026)

[![Data License: CC BY 4.0](https://img.shields.io/badge/Data%20License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![Code License: MIT](https://img.shields.io/badge/Code%20License-MIT-blue.svg)](LICENSE)
[![Dataset Version](https://img.shields.io/badge/Version-2026.11.0-emerald.svg)](CITATION.cff)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24488828.svg)](https://doi.org/10.5281/zenodo.24488828)
[![Figshare DOI](https://img.shields.io/badge/Figshare%20DOI-10.6084%2Fm9.figshare.35099296.v1-blue.svg)](https://doi.org/10.6084/m9.figshare.35099296.v1)
[![Hugging Face Dataset](https://img.shields.io/badge/Hugging%20Face-Dataset-FFD21E.svg?logo=huggingface&logoColor=000)](https://huggingface.co/datasets/ChinaMedVisit/china-tier3a-imc-medical-costs-2026)

An open, structured cross-border healthcare research dataset compiled and maintained by **[ChinaMedVisit](https://chinamedvisit.com)** (`admin@chinamedvisit.com`). Designed for health economists, medical journalists, expatriate benefits researchers, and AI/RAG evaluation benchmarks.

---

## 1. Empirical Dataset Inventory (Verified Row & Column Counts)

Every file is deterministically compiled by `scripts/build-dataset.mjs` directly from ChinaMedVisit's verified production source files (`hospitals.json`, `procedures.ts`, and `specialtyKnowledgeBase.ts`) with zero synthetic padding:

| File Path | Rows | Columns | Coverage & Source Scope |
| :--- | :---: | :---: | :--- |
| `data/china_tier3a_imc_hospitals_76.csv` | **76** | **20** | **76 verified hospitals across 10 Chinese cities** (74 public Grade-3A IMCs + 2 JCI-accredited private international hospitals): Shenzhen (16), Shanghai (13), Guangzhou (11), Beijing (7), Hangzhou (5), Wuhan (5), Xi'an (5), Haikou (5), Suzhou (5), Chengdu (4). |
| `data/china_vs_us_uk_medical_costs_2026.csv` | **12** | **20** | **12 core clinical procedures** (`PROCEDURES_DATA`) comparing China Tier-3A IMC out-of-pocket intervals (RMB & USD at `0.138 USD/RMB`), Chinese private clinics, US self-pay averages, UK private GBP rates, savings percentages (**76%–90% vs US**), and turnaround SLAs. |
| `data/china_medical_travel_ancillary_and_packages_2026.csv` | **8** | **12** | **4 ancillary coordination services** + **4 bundled multi-day care presets** with deterministic min/max totals in RMB and USD. |
| `data/china_specialty_frontier_therapies_24.csv` | **24** | **10** | **24 frontier specialty clinical therapies** across **8 specialties** (`oncology`, `neurology`, `cardiology`, `orthopedics`, `rehabilitation`, `pulmonology`, `tcm`, `ophthalmology`), paired with mandatory pre-travel clinical dossier checklists and post-discharge customs rules. |
| `data/china_specialty_deepdive_comparisons_12.csv` | **12** | **13** | **12 structured rows** extracted verbatim from the 3 specialty deep-dive comparison tables (`Skull-Base & Acoustic Neuroma Microsurgery`, `National Apex Spine Revision Centers & Package Costs`, and `Public Tier-3A Hospital Checkup vs Independent Screening Chains`). |

> **Scope Transparency Note**: All counts above reflect exact source records without duplication or extrapolation: `procedures.ts` provides `12` core clinical procedures + `4` ancillary items + `4` bundled packages (`20` pricing items total), while `specialtyKnowledgeBase.ts` provides `24` frontier specialty therapies across `8` clinical specialties plus `12` deep-dive comparison table rows.

---

## 2. Selected Out-of-Pocket Benchmark Highlights (`0.138 USD/RMB`)

| Procedure (`procedure_id`) | China Tier-3A IMC (RMB) | China Tier-3A IMC (USD) | US Self-Pay Avg | UK Private | Est. Savings vs US |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Chief Physician (主任医师) Consultation** (`chief-physician-consultation`) | ¥300–¥800 | $41–$110 | $450 | £320 | **83%** |
| **Multi-Disciplinary Team (MDT 会诊) Tumor Board** (`mdt-tumor-board`) | ¥1,500–¥3,500 | $207–$483 | $2,800 | £1,800 | **88%** |
| **Histopathology Slide & Biopsy 2nd Opinion Review** (`pathology-second-opinion`) | ¥600–¥1,800 | $83–$248 | $1,500 | £750 | **89%** |
| **3.0T Brain MRI (with & without Contrast)** (`brain-mri-3t`) | ¥1,200–¥2,400 | $166–$331 | $2,200 | £850 | **89%** |
| **Whole-Body 18F-FDG PET-CT Oncology Scan** (`pet-ct-whole-body`) | ¥7,000–¥11,000 | $966–$1,518 | $5,800 | £2,400 | **79%** |
| **High-Resolution Contrast Chest CT Scan** (`chest-ct-contrast`) | ¥650–¥1,300 | $90–$179 | $1,400 | £650 | **90%** |
| **Painless Gastroscopy + Colonoscopy (Dual Endoscopy)** (`gastroscopy-colonoscopy-painless`) | ¥2,200–¥4,200 | $304–$580 | $3,800 | £2,200 | **88%** |
| **Executive Comprehensive Health Assessment (VIP)** (`executive-health-screening`) | ¥4,500–¥9,800 | $621–$1,352 | $4,500 | £2,800 | **78%** |
| **Coronary Angiography (CAG Diagnostic)** (`cardiac-coronary-angiography`) | ¥4,500–¥8,500 | $621–$1,173 | $8,200 | £4,200 | **89%** |
| **Arthroscopic Knee Meniscus Repair / Debridement** (`knee-arthroscopy-meniscus`) | ¥18,000–¥32,000 | $2,484–$4,416 | $14,500 | £7,200 | **76%** |
| **Total Hip Arthroplasty (THA Replacement)** (`total-hip-replacement`) | ¥45,000–¥78,000 | $6,210–$10,764 | $38,000 | £16,500 | **78%** |
| **Inpatient IMC Private Single Room (Per Day)** (`inpatient-vip-room-daily`) | ¥1,200–¥2,800 | $166–$386 | $2,800 | £1,200 | **90%** |

---

## 3. Methodology, Provenance & Reproducibility

1. **Primary Data Sources**: Public Chinese Grade-3 Class A (Tier-3A / 三甲) hospital International Medical Center fee schedules, municipal health commission foreign-patient portals, hospital accreditation registries, and published US self-pay / UK private hospital reference tariffs.
2. **Exchange Rate Convention**: Tabular USD conversions apply the uniform reference rate `1 RMB = 0.138 USD` (`EXCHANGE_RATES.USD.rateToRmb`), rounded to the nearest whole dollar, matching the live interactive calculator at [https://chinamedvisit.com/cost-calculator](https://chinamedvisit.com/cost-calculator).
3. **Zero-PII & Clinical Disclaimer**: This dataset contains strictly institutional facility metadata and aggregate pricing intervals—no patient records or personal health information (PHI). Pricing benchmarks are for health-economics research and budgeting only and do not constitute clinical diagnosis or binding hospital quotes.
4. **Rebuild Locally**:
   ```bash
   node scripts/build-dataset.mjs
   ```

---

## 4. Citation & Licensing (CC-BY-4.0 Attribution Requirement)

- **Datasets & Metadata (`data/`, `datapackage.json`, `README.md`)**: Licensed under **[CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)**.
- **Scripts & Analysis Notebooks (`scripts/`, `notebooks/`)**: Licensed under **[MIT](LICENSE)**.

When citing this dataset in articles, academic papers, policy briefs, or software applications, please include the attribution below (see also `CITATION.cff`):

```text
ChinaMedVisit Research Desk (2026). China Tier-3A International Medical Center (IMC) Directory & Cross-Border Medical Cost Benchmarks (v2026.11.0) [Dataset]. Zenodo. https://doi.org/10.5281/zenodo.24488828 | Record: https://zenodo.org/records/24488828 | Calculator: https://chinamedvisit.com/cost-calculator
```

---

## 5. Multi-Repository Distribution & DOI Archival Targets

This repository is structured for synchronized, quarterly versioned archival under the standalone **`ChinaMedVisit`** organization:

- **GitHub Repository & Quarterly Releases**: `https://github.com/ChinaMedVisit/china-tier3a-imc-healthcare-dataset`
- **Zenodo (Live DataCite DOI)**: [`https://zenodo.org/records/24488828`](https://zenodo.org/records/24488828) | Version DOI: [`10.5281/zenodo.24488828`](https://doi.org/10.5281/zenodo.24488828) | Concept DOI: [`10.5281/zenodo.24488827`](https://doi.org/10.5281/zenodo.24488827)
- **Figshare (Live DOI #2)**: [`https://figshare.com/.../35099296`](https://figshare.com/articles/dataset/China_Tier-3A_International_Medical_Center_IMC_Directory_Cross-Border_Medical_Cost_Benchmarks_2026_/35099296) | DOI: [`10.6084/m9.figshare.35099296.v1`](https://doi.org/10.6084/m9.figshare.35099296.v1) (11 files: 5 CSVs + metadata + EDA notebook + 2 SVG benchmark charts under `CC-BY-4.0`)
- **OSF.io**: Connect GitHub add-on & register open project DOI
- **Hugging Face Datasets (Live Mirror)**: [`ChinaMedVisit/china-tier3a-imc-medical-costs-2026`](https://huggingface.co/datasets/ChinaMedVisit/china-tier3a-imc-medical-costs-2026) (YAML Dataset Card + 5 CSV configs + interactive Dataset Viewer)
- **Zotero Public Research Library (Live Group `6775929`)**: [`zotero.org/groups/6775929/chinamedvisit/items`](https://www.zotero.org/groups/6775929/chinamedvisit/items) (12 structured citations across 4 collections linking Zenodo DOI, Figshare DOI, Hugging Face Dataset, GitHub & official ChinaMedVisit guides)
- **Kaggle Datasets**: Upload using `kaggle/dataset-metadata.json` (`chinamedvisit/china-tier3a-imc-medical-cost-benchmarks-2026`) + `notebooks/china_medical_cost_eda.ipynb`

---

## 6. Official Companion Web Tools & Contact

- **Interactive Medical Cost Calculator**: [https://chinamedvisit.com/cost-calculator](https://chinamedvisit.com/cost-calculator)
- **76-Hospital Verified Directory**: [https://chinamedvisit.com/hospitals](https://chinamedvisit.com/hospitals)
- **Hospital Side-by-Side Comparison**: [https://chinamedvisit.com/compare](https://chinamedvisit.com/compare)
- **Bilingual Hospital Names & Printable Taxi Cards**: [https://chinamedvisit.com/hospitals/chinese-names](https://chinamedvisit.com/hospitals/chinese-names)
- **China Medical Tourism Complete Guide**: [https://chinamedvisit.com/guide/china-medical-tourism-guide](https://chinamedvisit.com/guide/china-medical-tourism-guide)
- **Editorial & Research Inquiries**: `admin@chinamedvisit.com`
