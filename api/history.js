import { db } from "hatchable";
export const access = "user";
export const methods = ["GET"];

export default async function(req,res) {
  try {
    const {rows} = await db.query("SELECT id, created_at, job_title, resume_label, similarity_score, skill_coverage_score, resume_word_count, matched_skills, missing_skills, additional_skills, quality, suggestions, bullet_suggestions, scoring_method FROM analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",[req.user.id]);
    res.json({items:rows});
  } catch(e) {
    res.status(500).json({error:"Could not load analysis history."});
  }
}