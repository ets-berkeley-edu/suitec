# Deploy SuiteC

Open a terminal and perform the steps below.

```
export SUITEC_BASE_DIR=~/suitec

cd $SUITEC_BASE_DIR

# Required Node version is in .nvmrc
nvm use

# NPM install, bower install and gulp build
./scripts/install-locally.sh

# Start the app
node app
```

Have a nice day!
