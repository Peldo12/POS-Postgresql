const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function agent(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    // Generate jawaban
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log(response);

    return response.text();
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = agent;
