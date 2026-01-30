const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://daselman:msft@BHAM2021@127.0.0.1:27017/admin?authSource=admin';

app.use(express.static(__dirname));

app.get('/data', async (req, res) => {
  console.log('Received request for /data');
  try {
    console.log('Connecting to MongoDB:', MONGO_URI);
    const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    console.log('Connected to MongoDB');
    const adminDb = client.db().admin();
    let dbs;
    try {
      dbs = await adminDb.listDatabases();
      console.log('Databases found:', dbs.databases.map(d => d.name));
    } catch (err) {
      console.error('Error listing databases:', err);
      throw err;
    }
    const result = [];
    for (const dbInfo of dbs.databases) {
      const dbName = dbInfo.name;
      const db = client.db(dbName);
      let collections = [];
      try {
        collections = await db.listCollections().toArray();
        console.log(`Collections in ${dbName}:`, collections.map(c => c.name));
      } catch (err) {
        console.error(`Error listing collections in ${dbName}:`, err);
        continue;
      }
      const colData = [];
      for (const col of collections) {
        try {
          const docs = await db.collection(col.name).find({}).limit(100).toArray();
          colData.push({ name: col.name, documents: docs });
        } catch (err) {
          console.error(`Error reading collection ${col.name} in ${dbName}:`, err);
          continue;
        }
      }
      result.push({ name: dbName, collections: colData });
    }
    await client.close();
    res.json(result);
  } catch (err) {
    console.error('Error in /data handler:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`App running at http://localhost:${PORT}`);
});
