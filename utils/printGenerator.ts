import { Client } from '../types';

// FORMATADOR INTELIGENTE (Auto-Resize)
const field = (label: string, value: string = '', width: string = '100%') => {
  const text = value || '';
  const len = text.length;
  
  // Lógica de redução de fonte baseada em caracteres
  let fontSize = '14px';
  let paddingTop = '0px';
  
  if (len > 40) { fontSize = '9px'; paddingTop = '3px'; } 
  else if (len > 30) { fontSize = '10px'; paddingTop = '2px'; } 
  else if (len > 20) { fontSize = '12px'; paddingTop = '1px'; }

  return `
  <div style="display: flex; align-items: flex-end; margin-bottom: 4px; width: ${width};">
    <span style="font-weight: bold; white-space: nowrap; font-size: 14px; margin-right: 5px; color: black;">${label}</span>
    <div style="border-bottom: 1px solid black; flex: 1; padding: 0 5px; font-size: ${fontSize}; padding-top: ${paddingTop}; text-transform: uppercase; font-weight: 500; color: black; white-space: nowrap; overflow: hidden;">
      ${text}
    </div>
  </div>
`;
};

// Cabeçalho do Ministério (Brasão)
const getHeaderHtml = () => `
  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 20px; text-align: center;">
    <img 
      src="https://upload.wikimedia.org/wikipedia/commons/b/bf/Coat_of_arms_of_Brazil.svg" 
      alt="Brasão" 
      style="width: 80px; height: 80px; margin-bottom: 10px;"
    />
    <h1 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0; color: black;">Ministério da Agricultura, Pecuária e Abastecimento</h1>
    <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 0; color: black;">Secretaria de Aquicultura e Pesca</h2>
    <h3 style="font-size: 20px; font-weight: bold; text-transform: uppercase; margin-top: 20px; text-decoration: underline; text-underline-offset: 4px; color: black;">Declaração de Residência</h3>
  </div>
`;

// HTML DA DECLARAÇÃO
const getDeclaracaoHtml = (client: Client) => {
  const c = {
    nome: client.nome_completo,
    nacionalidade: client.nacionalidade || 'BRASILEIRA',
    estado_civil: client.estado_civil,
    profissao: client.profissao,
    telefone: client.telefone,
    rg: client.rg,
    orgao_emissor: client.orgao_emissor,
    cpf: client.cpf_cnpj,
    email: client.email,
    endereco_logradouro: client.endereco,
    endereco_numero: client.numero_casa,
    endereco_bairro: client.bairro,
    endereco_cidade: client.cidade,
    endereco_uf: client.uf,
    endereco_cep: client.cep,
  };

  return `
    ${getHeaderHtml()}
    
    <p style="margin-bottom: 15px; font-size: 14px; color: black;">Na falta de documentos próprios, aptos a comprovarem a minha residência e domicílio, eu:</p>
    <div style="display: flex; flex-wrap: wrap; gap: 5px;">
      ${field('Nome:', c.nome, '100%')}
      <div style="display: flex; width: 100%; gap: 15px;">
        ${field('Nacionalidade:', c.nacionalidade, '50%')}
        ${field('Estado Civil:', c.estado_civil, '50%')}
      </div>
      <div style="display: flex; width: 100%; gap: 15px;">
        ${field('Profissão:', c.profissao, '50%')}
        ${field('Telefone:', c.telefone, '50%')}
      </div>
      <div style="display: flex; width: 100%; gap: 15px;">
        ${field('RG nº:', c.rg, '33%')}
        ${field('Órgão Emissor:', c.orgao_emissor, '33%')}
        ${field('CPF nº:', c.cpf, '33%')}
      </div>
      ${field('E-mail:', c.email, '100%')}
    </div>

    <p style="margin: 15px 0; font-size: 14px; font-weight: bold; color: black;">Declaro ser residente e domiciliado(a) no endereço:</p>
    <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 15px;">
      <div style="display: flex; width: 100%; gap: 15px;">
        ${field('Logradouro:', c.endereco_logradouro, '75%')}
        ${field('Número:', c.endereco_numero, '25%')}
      </div>
      <div style="display: flex; width: 100%; gap: 15px;">
        ${field('Bairro:', c.endereco_bairro, '30%')}
        ${field('Município:', c.endereco_cidade, '40%')}
        ${field('UF:', c.endereco_uf, '10%')}
        ${field('CEP:', c.endereco_cep, '20%')}
      </div>
    </div>

    <div style="border: 1px solid #999; padding: 10px; border-radius: 4px; font-size: 11px; text-align: justify; line-height: 1.3; margin-bottom: 20px; color: black;">
      <p style="margin-bottom: 5px;">Declaro sob responsabilidade civil e penal, que as informações declaradas acima são verdadeiras e que estou ciente que as informações não verídicas declaradas implicarão em penalidades previstas no Artigo 299 do Código Penal (Falsidade Ideológica), além de sanções civis e administrativas cabíveis, conforme dispõe a Lei nº 7.115, de 29 de agosto de 1983.</p>
      <p style="font-style: italic;">"Art. 299 - Omitir, em documento público ou particular, declaração que dele devia constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que devia ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre fato juridicamente relevante. Pena - reclusão, de um a cinco anos, e multa."</p>
    </div>

    <p style="margin-bottom: 30px; font-size: 14px; color: black;">Por ser verdade, assino esta declaração:</p>

    <div style="text-align: right; margin-bottom: 40px; font-size: 14px; color: black;">
      ${c.endereco_cidade || 'Local'}, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
    </div>

    <div style="text-align: center; margin-bottom: 40px;">
      <div style="border-top: 1px solid black; width: 60%; margin: 0 auto 5px auto;"></div>
      <div style="font-weight: bold; font-size: 14px; text-transform: uppercase; color: black;">${c.nome}</div>
      <div style="font-size: 12px; color: black;">Assinatura do Declarante</div>
    </div>

    <div style="border: 1px solid black; padding: 10px; page-break-inside: avoid; color: black;">
        <h4 style="text-align: center; font-weight: bold; font-size: 11px; margin: 0 0 10px 0; background: #eee; padding: 2px;">ASSINATURA A ROGO EM CASO DO INTERESSADO ANALFABETO E TESTEMUNHAS</h4>
        <div style="display: flex; gap: 20px;">
            <div style="width: 80px; height: 100px; border: 1px solid black; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #666;">POLEGAR<br>DIREITO</div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 15px;">
                <div><div style="border-bottom: 1px solid black; font-size: 10px; margin-bottom: 2px;">NOME:</div><div style="display: flex; gap: 10px;"><div style="width: 50%; border-bottom: 1px solid black; font-size: 10px;">CPF:</div><div style="width: 50%; border-bottom: 1px solid black; font-size: 10px;">ASS:</div></div></div>
                <div><div style="border-bottom: 1px solid black; font-size: 10px; margin-bottom: 2px;">NOME:</div><div style="display: flex; gap: 10px;"><div style="width: 50%; border-bottom: 1px solid black; font-size: 10px;">CPF:</div><div style="width: 50%; border-bottom: 1px solid black; font-size: 10px;">ASS:</div></div></div>
            </div>
        </div>
    </div>
  `;
};

// FUNÇÃO PRINCIPAL DE IMPRESSÃO (LIMPA)
export const printDocuments = (client: Client, selectedDocs: { declaracao: boolean; procuracao: boolean }) => {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir.');
    return;
  }

  let contentHtml = '';

  // Lógica simplificada: Só gera Declaração se solicitado. Ignora "procuracao" se vier true.
  if (selectedDocs.declaracao) {
    contentHtml += `<div class="page">${getDeclaracaoHtml(client)}</div>`;
  }

  const finalHtml = `
    <html>
      <head>
        <title>Impressão - ${client.nome_completo}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            font-family: "Times New Roman", Times, serif; 
            background: #f0f0f0;
          }
          .page { 
            width: 210mm; 
            min-height: 297mm; 
            padding: 20mm; 
            margin: 20px auto; 
            background: white; 
            box-sizing: border-box; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            position: relative;
          }
          
          @media print {
            body { background: none; }
            .page { 
              margin: 0; 
              width: 100%; 
              box-shadow: none; 
              page-break-after: always;
            }
            
            /* FORCE COLOR & BLACK TEXT */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(finalHtml);
  printWindow.document.close();
};
