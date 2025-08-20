// server.js
const express = require('express');
const path = require('path');
const app = express();
const port = 8001;

// Absolute path to dist folder
const distPath = path.join(__dirname, 'dist');

// Serve static files
// app.use(express.static(distPath));

// Catch-all route (for React Router)
// app.get('/*', (req, res) => {
//   res.sendFile(path.join(distPath, 'index.html'));
// });


app.listen(port, () => {
  console.log(`✅ Server is running at http://localhost:${port}`);
});
