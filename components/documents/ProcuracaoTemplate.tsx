
import React from 'react';
import { Client } from '../../types';

interface ProcuracaoProps {
  client: Client;
}

export const ProcuracaoTemplate: React.FC<ProcuracaoProps> = ({ client }) => {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleString('pt-BR', { month: 'long' });
  const year = today.getFullYear();

  return (
    <div className="w-full h-full bg-white text-black p-[20mm] font-serif leading-relaxed text-justify mx-auto">
      <h1 className="text-center font-bold text-xl uppercase mb-12 decoration-2 underline underline-offset-4">Procuração Ad Judicia</h1>
      
      <p className="mb-6 indent-12 text-sm">
        <strong>OUTORGANTE:</strong> <strong>{client.nome_completo?.toUpperCase()}</strong>, nacionalidade {client.nacionalidade || 'brasileira'}, estado civil {client.estado_civil || 'solteiro(a)'}, profissão {client.profissao || 'autônomo(a)'}, inscrito(a) no CPF sob o nº {client.cpf_cnpj}, RG nº {client.rg || '___________'} {client.orgao_emissor}, residente e domiciliado(a) em {client.endereco}, {client.numero_casa}, {client.bairro}, {client.cidade}/{client.uf}, CEP {client.cep}.
      </p>
      
      <p className="mb-6 indent-12 text-sm">
        <strong>OUTORGADO:</strong> <strong>JAYRTON NOLETO & MACEDO ADVOCACIA</strong>, sociedade de advogados, com sede profissional em Santa Inês/MA.
      </p>
      
      <p className="mb-6 indent-12 text-sm">
        <strong>PODERES:</strong> Pelo presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) como seu(sua) bastante procurador(a), conferindo-lhe amplos poderes para o foro em geral, com cláusula "ad judicia et extra", em qualquer Juízo, Instância ou Tribunal, podendo propor contra quem de direito as ações competentes e defendê-lo(a) nas contrárias, seguindo-as até final decisão.
      </p>
      
      <p className="mb-12 indent-12 text-sm">
        <strong>PODERES ESPECÍFICOS:</strong> A presente procuração outorga poderes específicos para receber citação, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, firmar compromisso e assinar declaração de hipossuficiência econômica, tudo visando o bom e fiel cumprimento deste mandato.
      </p>
      
      <p className="mb-24 text-right text-sm">
        {client.cidade || 'Santa Inês'} - {client.uf || 'MA'}, {day} de {month} de {year}.
      </p>
      
      <div className="flex flex-col items-center justify-center">
        <div className="w-2/3 border-t border-black mb-2"></div>
        <div className="font-bold uppercase text-sm">{client.nome_completo}</div>
        <div className="text-xs">Outorgante</div>
      </div>
    </div>
  );
};
