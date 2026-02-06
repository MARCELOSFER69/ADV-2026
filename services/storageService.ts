import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Configuração via Variáveis de Ambiente (Segurança)
const ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID;
const ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME;
const PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

// Inicializa o Cliente R2 (Compatível com S3)
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/**
 * Faz upload de um arquivo para o R2
 * @param file O arquivo selecionado pelo usuário
 * @param folder Pasta virtual (ex: ID do cliente)
 * @returns Objeto com URL e Path
 */
export const uploadFileToR2 = async (file: File, folder: string) => {
  try {
    // Cria nome único: id_cliente_nome-limpo/timestamp_nome-limpo.ext
    // Trim para evitar espaços no final/início que quebram a URL
    const cleanFolder = folder.trim().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/-$/, '');
    const cleanFileName = file.name.trim().replace(/[^a-zA-Z0-9.]/g, '-').replace(/-+/g, '-');
    const fileName = `${cleanFolder}/${Date.now()}_${cleanFileName}`;

    // --- CORREÇÃO CRÍTICA AQUI ---
    // Converte o arquivo para Buffer para evitar o erro "getReader is not a function"
    const fileBuffer = await file.arrayBuffer();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: new Uint8Array(fileBuffer), // Envia como dados binários seguros
      ContentType: file.type,
      // ACL: 'public-read' // Descomente se seu bucket precisar dessa flag explícita
    });

    await r2Client.send(command);

    // Retorna os dados para salvar no banco
    return {
      path: fileName, // Para deletar depois (Key)
      url: `${PUBLIC_URL}/${fileName}` // Para acessar/baixar (Link)
    };
  } catch (error) {
    console.error("Erro no Upload R2:", error);
    throw new Error("Falha ao enviar arquivo para a nuvem.");
  }
};

/**
 * Deleta um arquivo do R2
 * @param path O caminho do arquivo (ex: id_cliente/arquivo.pdf)
 */
export const deleteFileFromR2 = async (path: string) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error("Erro ao deletar R2:", error);
    throw new Error("Falha ao remover arquivo da nuvem.");
  }
};

/**
 * Lista arquivos de um cliente no R2
 * @param clientId ID do cliente (usado como prefixo da pasta)
 * @returns Lista de caminhos dos arquivos encontrados
 */
export const listClientFilesFromR2 = async (clientId: string) => {
  try {
    // Busca por qualquer pasta que inicie com o ID do cliente
    // Isso permite encontrar tanto pastas antigas (apenas ID) quanto novas (ID_Nome)
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${clientId}`,
    });

    const response = await r2Client.send(command);

    if (!response.Contents) return [];

    return response.Contents.map(obj => ({
      path: obj.Key || '',
      url: `${PUBLIC_URL}/${obj.Key}`,
      lastModified: obj.LastModified,
      size: obj.Size
    }));
  } catch (error) {
    console.error("Erro ao listar arquivos R2:", error);
    return [];
  }
};
