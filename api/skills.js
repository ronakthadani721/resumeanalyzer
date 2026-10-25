import { db } from "hatchable";
export const access = "user";
export const methods = ["GET","POST"];

export default async function(req,res) {
  if (req.method === "GET") {
    try {
      const {rows} = await db.query("SELECT s.analysis_id, s.skill_name, s.category, s.status, s.learned, a.job_title, a.created_at FROM analysis_skills s JOIN analyses a ON a.id = s.analysis_id WHERE s.user_id = $1 AND s.status = 'missing' ORDER BY a.created_at DESC, s.category, s.skill_name",[req.user.id]);
      return res.json({items:rows});
    } catch(e) { return res.status(500).json({error:"Could not load your skill checklist."}); }
  }
  const b = req.body || {};
  const analysisId = String(b.analysisId || "");
  const skillName = String(b.skillName || "").trim().toLowerCase();
  const learned = b.learned === true;
  if (!/^[0-9a-f-]{36}$/i.test(analysisId) || !skillName || skillName.length > 100) return res.status(400).json({error:"Invalid skill update."});
  try {
    const own = await db.query("SELECT id FROM analyses WHERE id = $1 AND user_id = $2",[analysisId,req.user.id]);
    if (!own.rows.length) return res.status(404).json({error:"Analysis not found."});
    const result = await db.query("UPDATE analysis_skills SET learned = $1 WHERE analysis_id = $2 AND user_id = $3 AND skill_name = $4 RETURNING skill_name, learned",[learned,analysisId,req.user.id,skillName]);
    if (!result.rows.length) return res.status(404).json({error:"Skill not found for this analysis."});
    res.json({ok:true,skill:result.rows[0]});
  } catch(e) {
    res.status(500).json({error:"Could not update skill progress."});
  }
}