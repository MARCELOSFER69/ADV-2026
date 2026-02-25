require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function verify() {
    const models = ["gemini-flash-latest", "gemini-pro-latest"];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    for (const m of models) {
        try {
            console.log(`Checking model: ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("test");
            console.log(`✅ ${m} WORKS! Response:`, result.response.text().slice(0, 50));
            return;
        } catch (error) {
            console.error(`❌ ${m} FAILED:`, error.message.slice(0, 200));
        }
    }
}

verify();
