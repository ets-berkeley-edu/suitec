# Deploy SuiteC

**WARNING:** The deploy script performs `git reset --hard HEAD` which will wipe away un-stashed work. The script is intended for dev, qa and prod; not developer workstations.

First time deploying to this machine? If so, clone the `suite-ops` repo.
```
cd ~

git clone git://github.com/ets-berkeley-edu/suitec-ops.git

```

Deploy SuiteC by branch or tag name:
```
# The following might have been performed by .bash_profile
export SUITEC_BASE_DIR=~/collabosphere

cd ~/suitec-ops

git pull

./scripts/deploy.sh [-r remote] [-b branch] [-t tag]

# You are done. Perform post-deploy tasks, if any, and then start SuiteC.
```

For complete usage information, with examples, run the script with no args:
```
./suitec-ops/scripts/deploy.sh
```

Have a nice day!
