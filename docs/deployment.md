# Deploying SuiteC

SuiteC contains a deployment script that can be used to deploy the latest code of a specific branch. Before running the script, the following environment variables should be set:

- `DOCUMENT_ROOT`: The directory where the checked out SuiteC code can be found
- `ORIGIN` (optional): The GitHub repository from which the branch should be deployed. By default, the deploy will happen from origin
- `BRANCH` (optional): The GitHub branch that should be deployed. By default, the deploy will happen from master

The deployment script can be run by executing the following command from the project's root folder:

```
./deploy/deploy.sh
```

**WARNING:** The `deploy.sh` script performs `git reset --hard HEAD` which will wipe away un-stashed work. The script is intended for dev, qa and prod; not developer workstations.

Have a nice day!
