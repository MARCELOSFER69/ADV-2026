
import os
import hashlib
import base64
import yaml
from datetime import datetime

def generate_latest_yml():
    release_dir = os.path.join(os.getcwd(), 'release')
    exe_file = None
    
    # 1. Encontrar o executável
    for f in os.listdir(release_dir):
        if f.endswith('.exe'):
            exe_file = f
            break
            
    if not exe_file:
        print("❌ Erro: Nenhum arquivo .exe encontrado na pasta release.")
        return

    exe_path = os.path.join(release_dir, exe_file)
    print(f"Processando: {exe_file}")

    # 2. Calcular SHA512 e Tamanho
    sha512_hash = hashlib.sha512()
    with open(exe_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha512_hash.update(byte_block)
            
    # Electron-updater usa base64 do hash binário, não hex
    sha512_base64 = base64.b64encode(sha512_hash.digest()).decode('utf-8')
    file_size = os.path.getsize(exe_path)
    
    # 3. Pegar versão do package.json
    import json
    with open('package.json', 'r') as f:
        pkg = json.load(f)
        version = pkg.get('version', '0.0.0')

    # 4. Criar conteúdo do YAML
    data = {
        'version': version,
        'files': [
            {
                'url': exe_file,
                'sha512': sha512_base64,
                'size': file_size
            }
        ],
        'path': exe_file,
        'sha512': sha512_base64,
        'releaseDate': datetime.now().isoformat()
    }
    
    # 5. Salvar latest.yml
    yml_path = os.path.join(release_dir, 'latest.yml')
    
    # Custom dumper para evitar aliases e manter formato limpo
    class NoAliasDumper(yaml.SafeDumper):
        def ignore_aliases(self, data):
            return True

    with open(yml_path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, default_flow_style=False, Dumper=NoAliasDumper)
        
    print(f"\n✅ SUCESSO! Arquivo gerado em:\n{yml_path}")
    print("\nAgora você pode subir no GitHub:")
    print(f"1. {exe_file}")
    print("2. latest.yml")

if __name__ == "__main__":
    try:
        # Instalar pyyaml se não tiver (in-script pip install é arriscado, melhor assumir que tem ou avisar)
        generate_latest_yml()
    except ImportError:
        print("Instalando dependência PyYAML...")
        os.system('pip install pyyaml')
        generate_latest_yml()
