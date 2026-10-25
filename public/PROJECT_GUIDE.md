# ResumeIQ — Portfolio Project Guide

ResumeIQ is a privacy-conscious resume-to-job comparison application built on Hatchable's hosted JavaScript runtime and PostgreSQL. The UI includes a dashboard, role templates, resume text extraction, score and quality results, saved history, skill progress, CSV/JSON/HTML exports, and Power BI setup guidance.

## Architecture

- `public/index.html`, `public/style.css`, `public/app.js`: responsive single-page interface. PDF.js and Mammoth are used in the browser to extract selectable PDF and DOCX text; the original file is not uploaded by the file picker flow.
- `lib/analyzer.js`: native JavaScript token normalization, stop-word filtering, pairwise TF-IDF weighting, cosine similarity, skill dictionary matching, quality checks, and improvement suggestions.
- `api/analyze.js`: validates and analyzes input, optionally calls the explicitly consented external Python service, and persists derived results only when the user opts into history.
- `api/history.js`, `api/analyses/[id].js`, `api/skills.js`, `api/export.js`: account-scoped history, deletion, skill learning state, and CSV export.
- `migrations/001_resumeiq.sql`: PostgreSQL tables and indexes.
- `public/python-service/`: optional FastAPI source using NumPy, Pandas, and scikit-learn. This folder is source material, not an executable Python runtime inside Hatchable.

## Scoring notes

The hosted JavaScript engine uses TF-IDF weighted token-frequency cosine similarity on the resume and job-description pair. Skill coverage is matched detected required skills divided by detected required skills, multiplied by 100. A keyword dictionary is a transparent baseline and can miss synonyms or context. Scores are not hiring probabilities.

## Privacy notes

App users sign in through Hatchable's passwordless account system. Saved records are scoped to the signed-in user. Original resume text is not persisted. The resume filename may be stored as a label. The optional Python service is off by default; checking its consent box sends resume text and job description to the configured external HTTPS service. Only use a service you control and configure securely. The service source does not persist input or log request bodies.

## Python service

Read `python-service/README.md`. Deploy the service separately on a Python-capable host, use HTTPS, add rate limits and access controls, then configure the Hatchable project value `python_service_url`. Leave the checkbox off to use the native JavaScript engine. If the endpoint is missing or returns invalid data, ResumeIQ does not claim to have used Python results.

## Power BI Desktop

1. Export the Analysis Summary CSV and Skills CSV from ResumeIQ.
2. In Power BI Desktop choose Get data → Text/CSV and import both files.
3. Create KPI cards for analysis count, average similarity, and average skill coverage.
4. Create a bar chart by skill name filtered to `status = missing`.
5. Create a line chart using `created_at` with average similarity and skill coverage.
6. Add slicers for job title and date.
7. Suggested measures after renaming tables to `Analyses` and `Skills`:

```DAX
Analysis Count = COUNTROWS(Analyses)
Average Similarity = AVERAGE(Analyses[similarity_score])
Average Skill Coverage = AVERAGE(Analyses[skill_coverage_score])
Missing Skill Rows = CALCULATE(COUNTROWS(Skills), Skills[status] = "missing")
Learned Skill Rows = CALCULATE(COUNTROWS(Skills), Skills[learned] = TRUE())
```

The skill export includes `analysis_id`; create a one-to-many relationship from `Analyses[id]` to `Skills[analysis_id]`. Power BI is not embedded or published by this project.

## Current limitations

- PDF/DOCX extraction depends on browser-accessible parser scripts. Scanned PDFs need OCR elsewhere or manual text entry.
- The native skill dictionary is intentionally small and should be expanded for a production product.
- The hosted Python service is optional and must be deployed separately; Python packages do not run inside the Hatchable JavaScript isolate.
- PDF report generation is not included; HTML and JSON reports are downloadable alternatives.