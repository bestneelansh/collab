import { generateJobEmbeddings } from "./src/utils/generateJobEmbeddings.js";

(async () => {
  try {
    await generateJobEmbeddings();
  } catch (error) {
    console.error("Error generating job embeddings:", error);
  }
})();
