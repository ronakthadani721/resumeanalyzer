import { db } from "hatchable";
export const access = "user";
export const methods = ["GET","DELETE"];

export default async function(req,res) {
  const id = String(req.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({error:"Invalid analysis ID."});
  try {
    if (req.method === "DELETE") {
      const result = await db.query("DELETE FROM analyses WHERE id = $1 AND user_id = $2 RETURNING id",[id,req.user.id]);
      if (!result.rowCount) return res.status(404).json({error:"Analysis not found."});
      return res.json({ok:true});
    }
    const {rows} = await db.query("SELECT * FROM analyses WHERE id = $1 AND user_id = $2",[id,req.user.id]);
    if (!rows.length) return res.status(404).json({error:"Analysis not found."});
    res.json({analysis:rows[0]});
  } catch(e) {
    res.status(500).json({error:"Could not access this analysis."});
  }
}