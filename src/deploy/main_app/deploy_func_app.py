

import os
from pathlib import Path
from zipfile import ZipFile
import subprocess
import os, shutil

func_zip_name = 'func-app.zip'
az_resource_group = 'rg-service-health-to-email-dev'
az_func_name = 'func-sh-dev'

current_working_directory = os.path.join(Path(os.getcwd()).parent.parent.absolute())
azfunc_directory = os.path.join(current_working_directory, 'az-servicehealth-integration')
func_deploy_dir = os.path.join(current_working_directory, 'deploy', 'main_app', 'func-app')
zip_to_dir = Path(func_deploy_dir).parent
zip_to_file_path = os.path.join(zip_to_dir, 'func-app.zip')

func_deploy_cmd = f'az functionapp deployment source config-zip -g {az_resource_group} -n {az_func_name} --build-remote --src "func-app.zip"'


if os.path.exists(func_deploy_dir):
    shutil.rmtree(func_deploy_dir)

if not os.path.exists(func_deploy_dir):
    os.makedirs(func_deploy_dir)

def copytree(src, dst, symlinks=False, ignore=None):

    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)

        if os.path.isdir(s):
            shutil.copytree(s, d, symlinks, ignore)
        else:
            fileDir = os.path.dirname(d)
            if not os.path.exists(fileDir):
                os.makedirs(fileDir)
            shutil.copy2(s, d)

def make_archive(source, destination):
    base_name = '.'.join(destination.split('.')[:-1])
    format = destination.split('.')[-1]
    root_dir = source # os.path.dirname(source)
    base_dir = './' #os.path.basename(source.strip(os.sep)) + '/'
    print(base_dir)
    shutil.make_archive(base_name, format, root_dir, base_dir)


# do npm build to output dist folder containing .js files
print(f'${azfunc_directory} : npm run build')
os.chdir(azfunc_directory)
p = subprocess.Popen('npm run build', shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

shutil.copy2(os.path.join(azfunc_directory, 'host.json'), os.path.join(func_deploy_dir))
shutil.copy2(os.path.join(azfunc_directory, 'package.json'), os.path.join(func_deploy_dir))
shutil.copy2(os.path.join(azfunc_directory, 'package-lock.json'), os.path.join(func_deploy_dir))
shutil.copy2(os.path.join(azfunc_directory, 'tsconfig.json'), os.path.join(func_deploy_dir))

# functions source files
copytree(os.path.join(azfunc_directory, 'dist', 'src'), os.path.join(func_deploy_dir, 'dist' , 'src'))
# functions source files
copytree(os.path.join(azfunc_directory, 'src', 'functions'), os.path.join(func_deploy_dir, 'src','functions'))
# copy helpers source files
copytree(os.path.join(azfunc_directory, 'src', 'helpers'), os.path.join(func_deploy_dir, 'src', 'helpers'))



# zip folder
print(f'zip func app at: ${func_deploy_dir}')
make_archive(func_deploy_dir, zip_to_file_path)

print(f'changing os directory to {zip_to_dir}')

os.chdir(zip_to_dir)
print(f'switch directory to: ${zip_to_dir}')
print(f'{func_deploy_cmd}')
p = subprocess.Popen(func_deploy_cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
for line in p.stdout.readlines():
    print(line),
retval = p.wait()

