
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
      
      <p className="mb-4 indent-12 text-sm">
        <strong>OUTORGANTE:</strong> <strong>{client.nome_completo?.toUpperCase()}</strong>, nacionalidade {client.nacionalidade || 'brasileira'}, estado civil {client.estado_civil || 'solteiro(a)'}, profissão {client.profissao || 'autônomo(a)'}, inscrito(a) no CPF sob o nº {client.cpf_cnpj}, RG nº {client.rg || '___________'} {client.orgao_emissor}, residente e domiciliado(a) em {client.endereco}, {client.numero_casa}, {client.bairro}, {client.cidade}/{client.uf}, CEP {client.cep}.
      </p>
      
      <p className="mb-4 indent-12 text-sm">
        <strong>OUTORGADO:</strong> <strong>JAYRTON NOLETO DE MACEDO</strong>, brasileiro, casado, advogado, inscrito na OAB/MG sob o nº 206.007 e na OAB/MA sob o nº 26.817-A, portador do RG nº 036673752009-4 SSP/MA e CPF nº 034.457.063-01, com endereço profissional na Rua Projetada 1, nº 65, Sala 01, Bairro Aeroporto, Santa Inês/MA, e-mail: jayrtonnoleto@outlook.com.
      </p>
      
      <p className="mb-4 indent-12 text-sm">
        <strong>PODERES GERAIS:</strong> O(a) Outorgante nomeia e constitui o Outorgado como seu bastante procurador, conferindo-lhe amplos poderes para o foro em geral, com a cláusula "ad judicia et extra", nos termos do Art. 104 do Código de Processo Civil e do Art. 5º, § 2º, do Estatuto da Advocacia. Fica o Outorgado autorizado a propor contra quem de direito as ações competentes e a defender o(a) Outorgante nas contrárias, em qualquer juízo, instância, tribunal ou esfera administrativa, bem como representá-lo(a) perante repartições públicas (federais, estaduais, municipais, autarquias ou entidades paraestatais). Pode, para tanto, arrolar e inquirir testemunhas, produzir provas, requerer vistas, concordar com cálculos, interpor recursos e praticar todos os atos necessários para o fiel cumprimento deste mandato.
      </p>
      
      <p className="mb-4 indent-12 text-sm">
        <strong>PODERES ESPECIAIS:</strong> Em estrita observância ao Artigo 105 do Código de Processo Civil, o(a) Outorgante confere ao Outorgado poderes especiais e específicos para: receber citação, confessar, reconhecer a procedência do pedido, transigir, fazer acordos, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, firmar compromissos, assinar declaração de hipossuficiência econômica, assinar termo de compromisso de inventariante e de renúncia, bem como requerer abertura de inventário ou arrolamentos. Fica expressamente autorizado o substabelecimento desta procuração, com ou sem reserva de poderes.
      </p>

      <p className="mb-8 indent-12 text-sm">
        <strong>CLÁUSULA DE USO DE IMAGEM PARA FINS COMPROBATÓRIOS:</strong> Para fins estritos de segurança jurídica, prevenção a fraudes e comprovação da autenticidade da assinatura aposta neste instrumento, o(a) OUTORGANTE expressamente concorda e autoriza o registro de sua imagem (por meio de fotografia ou gravação de vídeo) no exato momento da assinatura deste documento. O escritório outorgado compromete-se a armazenar tais registros em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilizando-os de forma restrita e exclusiva como meio de prova em eventuais incidentes de falsidade, processos judiciais, procedimentos administrativos ou auditorias.
      </p>
      
      <p className="mb-16 text-right text-sm">
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
