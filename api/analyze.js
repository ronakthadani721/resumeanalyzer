import { db, config } from "hatchable";
import { analyzeResume } from "lib/analyzer.js";

export const access = "user";
export const methods = ["POST"];

export default async function(req, res) {
  try {
    const b = req.body || {};
    let result = analyzeResume({
      resumeText: b.resumeText,
      jobTitle: b.jobTitle,
      jobDescription: b.jobDescription,
      selectedSkills: b.selectedSkills
    });
    if (b.usePythonService === true) {
      const base = await config.get("python_service_url");
      if (!base || typeof base !== "string" || !/^https:\/\//i.test(base)) {
        return res.status(400).json({error:"Python service is not configured with a valid HTTPS URL. Use native analysis or configure python_service_url in Hatchable settings."});
      }
      const remote = await fetch(base.replace(/\/+$/,"") + "/analyze", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({resumeText:b.resumeText,jobTitle:b.jobTitle,jobDescription:b.jobDescription,selectedSkills:b.selectedSkills || []})
      });
      if (!remote.ok) return res.status(502).json({error:"The optional Python service returned an error. No Python results were used."});
      const pythonResult = await remote.json();
      if (typeof pythonResult.similarityScore !== "number" || typeof pythonResult.skillCoverageScore !== "number" || !Array.isArray(pythonResult.matchedSkills) || !Array.isArray(pythonResult.missingSkills)) {
        return res.status(502).json({error:"The Python service response was invalid. No Python results were used."});
      }
      result = {...result,...pythonResult,jobTitle:result.jobTitle,scoringMethod:pythonResult.scoringMethod || "python-service"};
    }
    if (b.saveResults === false) return res.json({ok:true,saved:false,analysis:result});
    const userId = req.user.id;
    const inserted = await db.query(
      "INSERT INTO analyses (user_id, job_title, resume_label, similarity_score, skill_coverage_score, resume_word_count, quality, matched_skills, missing_skills, additional_skills, suggestions, bullet_suggestions, scoring_method) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13) RETURNING id, created_at",
      [userId, result.jobTitle, String(b.resumeLabel || "").slice(0,120), result.similarityScore, result.skillCoverageScore, result.resumeWordCount, JSON.stringify(result.quality), JSON.stringify(result.matchedSkills), JSON.stringify(result.missingSkills), JSON.stringify(result.additionalSkills), JSON.stringify(result.suggestions), JSON.stringify(result.bulletSuggestions), result.scoringMethod]
    );
    const row = inserted.rows[0];
    for (const [status, skills] of [["matched",result.matchedSkills],["missing",result.missingSkills],["additional",result.additionalSkills]]) {
      for (const skill of skills) {
        await db.query("INSERT INTO analysis_skills (analysis_id,user_id,skill_name,category,status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [row.id,userId,skill.name,skill.category,status]);
      }
    }
    res.status(201).json({ok:true, analysis:{...result,id:row.id,createdAt:row.created_at}});
  } catch (e) {
    res.status(400).json({error:e && e.message ? e.message : "Unable to analyze this resume."});
  }
}