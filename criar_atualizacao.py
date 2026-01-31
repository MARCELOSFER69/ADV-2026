import json
import os
import subprocess
import sys

def load_package_json():
    with open('package.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_package_json(data):
    with open('package.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def bump_version(current_version):
    major, minor, patch = map(int, current_version.split('.'))
    return f"{major}.{minor}.{patch + 1}"

def run_command(command):
    print(f"\n> Executando: {command}")
    try:
        # shell=True para Windows reconhecer npm
        subprocess.check_call(command, shell=True)
    except subprocess.CalledProcessError:
        print("Erro ao executar o comando. Processo abortado.")
        sys.exit(1)

def main():
    print("=== AUTOMATIZADOR DE ATUALIZAÇÃO (ELECTRON) ===")
    
    # 1. Ler versão atual
    pkg = load_package_json()
    current_version = pkg.get('version', '0.0.0')
    print(f"Versão Atual: {current_version}")
    
    # 2. Calcular nova versão
    new_version = bump_version(current_version)
    confirm = input(f"Deseja atualizar para a versão {new_version}? (S/n): ").strip().lower()
    
    if confirm and confirm != 's':
        new_version = input("Digite a versão manual (ex: 1.0.2): ").strip()
    
    # 3. Atualizar package.json
    print(f"Atualizando package.json para {new_version}...")
    pkg['version'] = new_version
    save_package_json(pkg)
    
    # 4. Rodar Build
    print("\nIniciando compilação do executável (Isso pode demorar uns minutos)...")
    run_command("npm run build:win")
    
    # 5. Instruções Finais
    print("\n" + "="*50)
    print(f"✅ SUCESSO! Versão {new_version} gerada.")
    print("="*50)
    print("\nPRÓXIMOS PASSOS OBRIGATÓRIOS:")
    print("1. Vá no GitHub > Releases")
    print(f"2. Crie uma nova Release com a tag: v{new_version}")
    print("3. Faça UPLOAD dos seguintes arquivos que estão na pasta 'release':")
    
    release_dir = os.path.join(os.getcwd(), 'release')
    if os.path.exists(release_dir):
        exe_files = [f for f in os.listdir(release_dir) if f.endswith('.exe')]
        yml_files = [f for f in os.listdir(release_dir) if f.endswith('.yml')]
        
        for f in exe_files:
            print(f"   - {f} (O Instalador)")
        for f in yml_files:
            print(f"   - {f} (Arquivo de controle de versão)")
    else:
        print(f"   (Verifique a pasta {release_dir})")
        
    print("\nAssim que você subir esses arquivos no GitHub, o Auto-Update funcionará para os clientes!")
    input("\nPressione ENTER para sair...")

if __name__ == "__main__":
    main()
