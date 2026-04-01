# 🤖 Guia do Robô PesqBrasil (Consulta RGP)

Este robô permite consultar a situação do RGP (Registro Geral da Atividade Pesqueira) de forma automatizada, seja através de uma planilha Excel ou diretamente pelo terminal.

## 📋 Pré-requisitos

Para rodar o robô, você precisa ter o **Python** instalado e as seguintes bibliotecas:

```powershell
pip install pandas openpyxl selenium undetected-chromedriver requests
```

> [!IMPORTANT]
> O robô utiliza o **Google Chrome**. Certifique-se de que ele está instalado e atualizado.

## 🚀 Como Usar

### Opção 1: Usando Planilha Excel (Interface Gráfica)
1. Prepare uma planilha `.xlsx` com uma coluna chamada **CPF**.
2. Dê um clique duplo no arquivo `robo_pesqbrasil_consulta.py` ou execute:
   ```powershell
   python robo_pesqbrasil_consulta.py
   ```
3. Uma janela abrirá pedindo para selecionar a sua planilha.
4. O robô processará cada CPF e criará um novo arquivo chamado `SUA_PLANILHA_RESULTADO.xlsx` na mesma pasta.

### Opção 2: Consulta Única via Terminal (CLI)
Se quiser consultar apenas um CPF rapidamente:
```powershell
python robo_pesqbrasil_consulta.py --cpf 000.000.000-00 --headless
```
* Use `--headless` para rodar sem abrir a janela do navegador.

## ⚠️ Dicas e Soluções de Problemas
- **Botão de Parada**: Durante a consulta em lote, uma pequena janela vermelha aparecerá no canto da tela. Você pode clicar nela para interromper o processo a qualquer momento.
- **Erro de Versão do Chrome**: O robô tenta detectar a versão automaticamente. Se falhar, certifique-se de que o Chrome não está aberto em outra janela de automação.
- **Captcha**: O site do MPA às vezes pode exibir desafios. O robô utiliza técnicas para evitar ser detectado, mas se muitos erros ocorrerem, tente rodar sem o modo `--headless` para observar o que está acontecendo.
