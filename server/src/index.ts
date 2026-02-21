import { env } from "./lib/env.js";
import { createApp } from "./app.js";
// Database removed as per refactor


const app = createApp();

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${env.PORT}`);
});

