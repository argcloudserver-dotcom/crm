const http = require("http");
const port = Number(process.env.PORT) || 8080;
http
  .createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(
      "Real-Estate monorepo root.\n\nThis project is a pnpm monorepo (Express API + Vite web + Expo mobile)\nand cannot be previewed in Lovable directly.\n\nTo run locally:\n  pnpm install\n  pnpm --filter @workspace/web dev\n"
    );
  })
  .listen(port, () => console.log(`monorepo placeholder listening on ${port}`));
