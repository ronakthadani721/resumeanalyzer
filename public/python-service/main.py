from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import pandas as pd
import re

app = FastAPI(title="ResumeIQ NLP Service", version="1.0.0")

SKILLS = {
    "Programming languages": ["python", "javascript", "java", "c", "c++", "r", "sql"],
    "Data analysis": ["numpy", "pandas", "data cleaning", "exploratory data analysis", "statistics", "excel"],
    "Databases and SQL": ["mysql", "postgresql", "postgres", "sqlite", "database design", "joins", "window functions"],
    "Machine Learning": ["machine learning", "scikit-learn", "sklearn", "regression", "classification", "decision tree", "random forest", "model evaluation", "feature engineering"],
    "NLP and AI": ["nlp", "natural language processing", "tf-idf", "cosine similarity", "deep learning", "neural networks", "generative ai", "llm", "prompt engineering"],
    "Data visualization": ["power bi", "tableau", "matplotlib", "seaborn", "data visualization", "dashboard"],
    "Cloud and deployment": ["aws", "azure", "gcp", "docker", "git", "github", "rest api", "streamlit", "deployment"],
    "Other professional skills": ["communication", "teamwork", "leadership", "problem solving", "agile"]
}

class AnalysisRequest(BaseModel):
    resumeText: str = Field(min_length=40, max_length=60000)
    jobDescription: str = Field(min_length=30, max_length=30000)
    jobTitle: str = Field(default="Untitled role", max_length=120)
    selectedSkills: list[str] = Field(default_factory=list, max_length=100)

@app.get("/health")
def health():
    return {"ok": True, "service": "resumeiq-python", "version": "1.0.0"}

@app.post("/analyze")
def analyze(body: AnalysisRequest):
    resume = body.resumeText.strip()
    job = body.jobDescription.strip()
    if len(resume) < 40 or len(job) < 30:
        raise HTTPException(status_code=400, detail="Resume or job description is too short.")
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
    try:
        matrix = vectorizer.fit_transform([resume, job])
        similarity = round(float(cosine_similarity(matrix[0:1], matrix[1:2])[0, 0]) * 100)
    except ValueError:
        similarity = 0
    def extract(text):
        normalized = " " + re.sub(r"[^a-z0-9+#. ]", " ", text.lower()) + " "
        found = []
        for category, names in SKILLS.items():
            for name in names:
                if " " + name + " " in normalized and not any(x["name"] == name for x in found):
                    found.append({"name": name, "category": category})
        return found
    resume_skills = extract(resume)
    job_skills = extract(job)
    selected = {x.strip().lower() for x in body.selectedSkills if x.strip()}
    if selected:
        job_skills = [x for x in job_skills if x["name"] in selected]
        known = {x["name"] for x in job_skills}
        job_skills.extend({"name": x, "category": "Other professional skills"} for x in selected-known)
    resume_names = {x["name"] for x in resume_skills}
    job_names = {x["name"] for x in job_skills}
    matched = [x for x in job_skills if x["name"] in resume_names]
    missing = [x for x in job_skills if x["name"] not in resume_names]
    additional = [x for x in resume_skills if x["name"] not in job_names]
    coverage = round(len(matched) / len(job_skills) * 100) if job_skills else 0
    checks = [
        ("Contact information", bool(re.search(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", resume))),
        ("Education", bool(re.search(r"education|bachelor|b\\.?tech|college|university|degree", resume, re.I))),
        ("Technical skills", bool(re.search(r"technical skills|skills|technologies", resume, re.I))),
        ("Projects", bool(re.search(r"projects|project experience", resume, re.I))),
        ("Work experience", bool(re.search(r"experience|employment|internship", resume, re.I))),
        ("Certifications", bool(re.search(r"certifications|certificates|certified", resume, re.I))),
        ("Professional summary", bool(re.search(r"summary|profile|objective|about me", resume, re.I))),
        ("GitHub or portfolio", bool(re.search(r"github\\.com|gitlab\\.com|portfolio|linkedin\\.com", resume, re.I))),
    ]
    word_count = len(re.findall(r"\b\w+\b", resume))
    action_verbs = len(re.findall(r"\b(built|developed|designed|implemented|analyzed|automated|improved|created|led|delivered|optimized|deployed|reduced|increased|launched|managed|tested|engineered|trained|evaluated)\b", resume, re.I))
    numeric_evidence = len(re.findall(r"\b\d+(?:\.\d+)?\s*%?|\$\s*\d+", resume))
    quality_score = round(sum(1 for _, ok in checks if ok) / len(checks) * 100)
    suggestions = ["Add or clarify " + name + " if relevant and accurate." for name, ok in checks if not ok]
    if missing:
        suggestions.insert(0, "Review these detected skill gaps only if relevant to your goals: " + ", ".join(x["name"] for x in missing[:8]) + ".")
    if action_verbs < 3:
        suggestions.append("Use specific action verbs where they accurately describe your contribution.")
    if numeric_evidence < 2:
        suggestions.append("Add measurable context only where you can verify the numbers; do not invent metrics.")
    repeated = pd.Series(re.findall(r"\b[a-zA-Z]{4,}\b", resume.lower())).value_counts()
    repeated_terms = [{"word": str(k), "count": int(v)} for k, v in repeated[repeated >= 8].head(8).items()]
    return {
        "jobTitle": body.jobTitle,
        "similarityScore": similarity,
        "skillCoverageScore": coverage,
        "matchedSkills": matched,
        "missingSkills": missing,
        "additionalSkills": additional,
        "quality": {"score": quality_score, "checks": [{"name": n, "present": ok, "suggestion": "" if ok else "Add or clarify this section if relevant."} for n, ok in checks], "wordCount": word_count, "actionVerbCount": action_verbs, "measurableEvidenceCount": numeric_evidence, "repeatedTerms": repeated_terms},
        "suggestions": suggestions,
        "bulletSuggestions": [],
        "resumeWordCount": word_count,
        "scoringMethod": "python-sklearn-tfidf-v1",
        "scoringExplanation": {"similarity": "TF-IDF unigram/bigram cosine similarity using scikit-learn.", "coverage": "Matched detected required skills divided by detected required skills. A zero denominator produces 0%.", "limitation": "These heuristic scores are not hiring probabilities and do not predict interview or job outcomes."}
    }