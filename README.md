# lab-fabric-basic

Material para laboratorio HLF, basado en Hyperledger Fabric y SmartContracts tanto en Node.js como Golang

## Requisitos

Requisitos base (ejecución):
- Docker CE [https://docs.docker.com/install/#supported-platforms](https://docs.docker.com/install/#supported-platforms)
- Node 14 LTS [https://nodejs.org/en/download/](https://nodejs.org/en/download/)
- Python 2.x y compilador C/C++. En Windows con Node.js instalado, se puede usar en su reemplazo [windows-build-tools](https://www.npmjs.com/package/windows-build-tools)
- cURL. En ambientes Linux, normalmente está disponible o se instala con el gestor de paquetes del sistema. En Windows, [descargar](https://curl.haxx.se/download.html) y agregar la ruta al PATH de sistema 

Requisitos desarrollo:
- IDE para desarrollo con soporte Node.js y Golang. Recomendación: [Visual Studio Code](https://code.visualstudio.com/)
- Golang 1.13 o superior, [descargar](https://golang.org/dl/)

__Nota:__ para ambientes Windows, Docker funciona de forma nativa sólo para Windows 10 Pro o Windows Server 2016, ya que requiere las funciones de Hyper-V. En otras versiones de Windows, se debe usar la versión antigua de Docker que se basa en VirtualBox.

## Iniciar ambiente

Para iniciar el entorno, hay 3 directorio:
- __chaincode:__ contiene 2 smartcontracts, uno Node y el otro Golang. Aprendan Golang, que es el hijo ilegítimo de C mezclado con otros lenguajes.
- __client:__ aplicación Node.js de tipo API REST que es además un cliente Fabric 1.3. Tiene las funciones que permiten crear canales, unir Peers a los canales, instalar/instanciar SmartContacts, solicitar querys sobre dichos SCs y hacer invocaciones de Transacciones.
- __network:__ contiene el material criptográfico para levantar la red, junto con el archivo de Docker que mágicamente les levantará una red Fabric con la organización cabrona de la red llamada MainOrg, y 2 organizaciones que no pueden administrar llamadas Org1 y Org2. Hay 2 scripts:
	- __setup.sh:__ borra cualquier instancia previa de la red, limpia contenedores y descarga las imágenes Docker que van a necesitar (y algunas que no van a necesitar)
	- __load.sh:__ una vez que la red esté andando (ver más abajo), este script genera 2 canales, une a los Peers a los canales e instala los 2 SmartContracts de ejemplo, y por último llama a la consulta llamada “ping” de cada uno, para forzar su instanciación.

El flujo para iniciar el ambiente local es:
- Abrir una shell y ejecutar:
```
cd network
sh ./setup.sh
docker-compose up -d
cd ..
cd client
npm install
node server.js
```
Esto dejará tomada la shell por el proceso Node

- Abrir otra shell y ejecutar:
```
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