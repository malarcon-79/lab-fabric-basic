# lab-fabric-basic

Material para laboratorio HLF, basado en Hyperledger Fabric y SmartContracts tanto en Node.js como Golang

## Requisitos

Requisitos base (ejecución):
- Docker CE [https://docs.docker.com/install/#supported-platforms](https://docs.docker.com/install/#supported-platforms)
- Node 14+ LTS [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
- Python 3.x y compilador C/C++. En Windows con Node.js instalado, se puede usar en su reemplazo [windows-build-tools](https://www.npmjs.com/package/windows-build-tools)
- cURL. En ambientes Linux, normalmente está disponible o se instala con el gestor de paquetes del sistema. En Windows, [descargar](https://curl.haxx.se/download.html) y agregar la ruta al PATH de sistema
- Intérprete de shell BASH. En windows, se puede instalar [GIT BASH](https://git-scm.com/download/win) como alternativa

Requisitos desarrollo:
- IDE para desarrollo con soporte Node.js y Golang. Recomendación: [Visual Studio Code](https://code.visualstudio.com/)
- Golang 1.13 o superior, [descargar](https://golang.org/dl/)

__Nota Windows:__ para ambientes Windows, Docker requiere habilitar la función [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install-win10). Si se desea usar Docker con Hyper-V, sólo están soportados Windows 10 Pro y Windows Server 2016 o superior.

__Nota Mac:__ para ambientes MacOS, Fabric requiere acceso al socket de Docker desde los nodos Peers. 
Existe un bug en los permisos de acceso en Mac, que se soluciona desactivando `gRPC FUSE` en las opciones de Docker Desktop.
- Ejecutar en shell (el primer comando puede fallar, pero no afecta):
```shell
sudo chgrp docker /var/run/docker.sock
sudo chmod g+w /var/run/docker.sock
```
- Ir a _"General"_ > _"Use gRPC FUSE for file sharing"_ y desactivar la opción.
- Presionar botón _"Apply & Restart"_.
- Esperar a que reinicie Docker

## Iniciar ambiente

Para iniciar el entorno, hay 3 directorio:
- __chaincode:__ contiene 2 smartcontracts, uno Node.js y el otro Golang. El smartcontract en Node.js tiene la ventaja de usar un lenguaje conocido (Javascript para Node.js / ECMAScript), mientras que el smartcontract en Go usa un lenguaje más estructurado y con una curva de aprendizaje algo complicada (deriva de C++ y Paradigma de Composición).
- __client:__ aplicación Node.js de tipo API REST que es además un cliente Fabric v1.x / v2.x. Tiene las funciones que permiten crear canales, unir Peers a los canales, instalar/instanciar SmartContacts, solicitar querys sobre dichos SmartContracts y hacer invocaciones de Transacciones.
- __network:__ contiene el material criptográfico para levantar la red, junto con el archivo de Docker que les levantará una red Fabric con la organización principal de la red llamada MainOrg, y 2 organizaciones secundarias (no pueden administrar la red) llamadas Org1 y Org2. Hay 2 scripts:
	- __setup.sh:__ borra cualquier instancia previa de la red, limpia contenedores y descarga las dependencias para el smarcontract en Golang
	- __load.sh:__ una vez que la red esté andando (ver más abajo), este script genera 2 canales, une a los Peers a los canales e instala los 2 SmartContracts de ejemplo, y por último llama a la consulta llamada “ping” de cada uno, para forzar su instanciación.

El flujo para iniciar el ambiente local es:
- Abrir una shell y ejecutar:
```shell
cd network
sh ./setup.sh
docker-compose up -d
cd ..
cd client
node .
```
Esto dejará tomada la shell por el proceso Node

- Abrir otra shell y ejecutar:
```shell
cd network
sh ./load.sh
```
Esto creará 2 channels (1 privado, otro público), unirá el peer de la organización administradora a los 2 channels y a las otras 2 organizaciones al channel público.

## Desarrollo

La API Node.js provee de las siguientes funciones (todas por POST):
- __/channels/create__: crea un channel, mediante una transacción inicial previamente creada usando __configtx__ de Fabric Tools
- __/channels/update__: permite reconfigurar un channel existente usando una transacción de reconfiguración creada usando __configtxlator__ de Fabric Tools
- __/channels/join__: permite a un Peer unirse a un canal especificado
- __/smartcontract/install__: instala/actualiza e instancia un smartcontract dado
- __/smartcontract/invoke__: invoca una transacción sobre un smartcontract, obtiene el endorsement necesario y solicita commit de dicha transacción
- __/smartcontract/query__: invoca una función de un smartcontact en modo query (no se genera commit de datos)

En el archivo [network/devchannel/test_chaincode.txt](./network/devchannel/test_chaincode.txt) hay ejemplos de llamadas a smartcontracts que se dejan como ejemplo y que son instalados por el scrit __load.sh__.

Para agregar nuevos smartcontracts, se debe editar el archivo [client/config/smartcontracts.json](./client/config/smartcontracts.json) y agregar la configuración necesaria.

Para visualizar la red mediante Hyperledger Explorer, abrir la dirección http://localhost:8080

## Detener ambiente

Para detener el ambiente local, abrir una shell y ejecutar:
```shell
cd network
docker-compose down
```

Para detener la API Node.js, seleccionar la shell donde se está ejecutando y presionar `CTRL+C`.