# Deploying SuiteC

## Apache

SuiteC uses Apache as its reverse proxy. SuiteC contains a script that will generate an Apache config file based on the project's configuration. This script can be run by executing the following command from the project's root folder:

```
node apache/apache.js
```

This will generate an Apache config file at `apache/collabosphere.conf`, which can be included into the main Apache config file.

Note: when running SuiteC behind SSL, the Apache config file will need to include `RequestHeader set X-Forwarded-Proto "https"` to ensure that Node.js correctly picks up the request protocol.

## Deployment script

SuiteC contains a deployment script that can be used to deploy the latest code of a specific branch. Before running the script, the following environment variables should be set:

- `DOCUMENT_ROOT`: The directory where the checked out SuiteC code can be found
- `ORIGIN` (optional): The GitHub repository from which the branch should be deployed. By default, the deploy will happen from origin
- `BRANCH` (optional): The GitHub branch that should be deployed. By default, the deploy will happen from master

The deployment script can be run by executing the following command from the project's root folder:

```
./deploy/deploy.sh
```
