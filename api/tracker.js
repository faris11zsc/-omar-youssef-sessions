export default async function handler(req, res) {
  const BIN_URL = 'https://extendsclass.com/api/json-storage/bin/fcdbadc';

  try {
    if (req.method === 'GET') {
      const response = await fetch(BIN_URL);
      const data = await response.json();
      return res.status(200).json(data);
    } 
    else if (req.method === 'POST') {
      const response = await fetch(BIN_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      if (!response.ok) throw new Error("Sync failed");
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
