export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DATABASE_ID = "5cb27942-1b67-4dc6-9de4-e9e72dafbbea";

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN environment variable is missing in Vercel.' });
  }

  async function notion(endpoint, method, body) {
    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
      method,
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Notion API Error: ${err}`);
    }
    return response.json();
  }

  try {
    const query = await notion(`databases/${DATABASE_ID}/query`, 'POST', {
      filter: { property: "Student Name", title: { equals: "Tracker_Storage" } }
    });

    let pageId;
    if (query.results.length === 0) {
      const newPage = await notion('pages', 'POST', {
        parent: { database_id: DATABASE_ID },
        properties: {
          "Student Name": { title: [{ text: { content: "Tracker_Storage" } }] },
          "Status": { select: { name: "Inactive" } }
        }
      });
      pageId = newPage.id;
    } else {
      pageId = query.results[0].id;
    }

    if (req.method === 'GET') {
      const blocks = await notion(`blocks/${pageId}/children`, 'GET');
      let jsonStr = "";
      for (const block of blocks.results) {
        if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
          jsonStr += block.paragraph.rich_text.map(rt => rt.plain_text).join('');
        }
      }
      
      let data = { youssef: [], omar: [] };
      if (jsonStr) {
        try { data = JSON.parse(jsonStr); } catch(e) {}
      }
      return res.status(200).json(data);
    } 
    else if (req.method === 'POST') {
      const data = req.body;
      const jsonStr = JSON.stringify(data);
      
      const blocks = await notion(`blocks/${pageId}/children`, 'GET');
      for (const block of blocks.results) {
        await notion(`blocks/${block.id}`, 'DELETE');
      }

      const chunks = jsonStr.match(/.{1,2000}/g) || [];
      const children = chunks.map(chunk => ({
        object: 'block',
        type: 'paragraph',
        paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] }
      }));

      if (children.length > 0) {
        await notion(`blocks/${pageId}/children`, 'PATCH', { children });
      }
      
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
