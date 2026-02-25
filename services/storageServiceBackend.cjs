const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');

// Configuração via Variáveis de Ambiente
const ACCOUNT_ID = process.env.VITE_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.VITE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.VITE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.VITE_R2_BUCKET_NAME;
const PUBLIC_URL = process.env.VITE_R2_PUBLIC_URL;

const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

/**
 * Faz upload de um arquivo local para o R2 (Backend version)
 */
async function uploadLocalFileToR2(filePath, folder) {
    try {
        if (!fs.existsSync(filePath)) throw new Error("Arquivo não encontrado: " + filePath);

        const stats = fs.statSync(filePath);
        if (stats.size === 0) throw new Error("Arquivo vazio");

        const baseName = path.basename(filePath);
        const cleanName = baseName.replace(/[^a-zA-Z0-9.]/g, '-');
        const fileName = `${folder}/${Date.now()}_${cleanName}`;

        const fileBuffer = fs.readFileSync(filePath);

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: "application/pdf" // REAP is always PDF
        });

        await r2Client.send(command);

        return {
            path: fileName,
            url: `${PUBLIC_URL}/${fileName}`,
            nome: baseName
        };
    } catch (error) {
        console.error("Erro no Upload R2 Backend:", error);
        throw error;
    }
}

module.exports = { uploadLocalFileToR2 };
