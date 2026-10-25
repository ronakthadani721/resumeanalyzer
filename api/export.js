import { db } from "hatchable";
export const access = "user";
export const methods = ["GET"];

function csvCell(v) {
  let s = typeof v === "string" ? v : JSON.stringify(v ?? "");
  return '"' + s.replace(/"/g,'""') + '"';
}
export default async function(req,res) {
  const type = String(req.query.type || "summary");
  try {
    let rows, header;
    if (type === "skills") {
      const r = await db.query("SELECT s.analysis_id, s.skill_name, s.category, s.status, s.learned, a.job_title, a.created_at, a.similarity_score, a.skill_coverage_score FROM analysis_skills s JOIN analyses a ON a.id = s.analysis_id WHERE s.user_id = $1 ORDER BY a.created_at DESC",[req.user.id]);
      rows = r.rows;
      header = ["analysis_id","skill_name","category","status","learned","job_title","created_at","similarity_score","skill_coverage_score"];
    } else {
      const r = await db.query("SELECT id, created_at, job_title, similarity_score, skill_coverage_score, resume_word_count, matched_skills, missing_skills, additional_skills, quality, suggestions, scoring_method FROM analyses WHERE user_id = $1 ORDER BY created_at DESC",[req.user.id]);
      rows = r.rows;
      header = ["id","created_at","job_title","similarity_score","skill_coverage_score","resume_word_count","matched_skills","missing_skills","additional_skills","quality","suggestions","scoring_method"];
    }
    const csv = [header.map(csvCell).join(","),...rows.map(row=>header.map(k=>csvCell(row[k])).join(","))].join("\r\n");
    res.setHeader("Content-Type","text/csv; charset=utf-8");
    res.setHeader("Content-Disposition",'attachment; filename="resumeiq-'+(type==="skills"?"skills":"analysis")+'.csv"');
    res.send(csv);
  } catch(e) {
    res.status(500).json({error:"Could not export your data."});
  }
}