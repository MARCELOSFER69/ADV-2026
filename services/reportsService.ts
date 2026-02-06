
import { supabase } from './supabaseClient';
import { GeneratedReport } from '../types';
import { uploadFileToR2, deleteFileFromR2 } from './storageService';

export const saveReportMetadata = async (report: Omit<GeneratedReport, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('generated_reports')
        .insert([report])
        .select()
        .single();

    if (error) throw error;
    return data as GeneratedReport;
};

export const fetchUserReports = async (userId: string) => {
    const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as GeneratedReport[];
};

export const deleteReport = async (report: GeneratedReport) => {
    // 1. Deletar do R2
    await deleteFileFromR2(report.storage_path);

    // 2. Deletar do Banco
    const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', report.id);

    if (error) throw error;
};

export const uploadReportToCloud = async (blob: Blob, fileName: string, userId: string) => {
    // Converter Blob para File pois uploadFileToR2 espera File
    const file = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Upload para a pasta de relatórios do usuário
    const folder = `reports/${userId}`;
    const storageData = await uploadFileToR2(file, folder);

    // Salvar meta-dados
    return await saveReportMetadata({
        name: fileName,
        storage_path: storageData.path,
        url: storageData.url,
        user_id: userId
    });
};
