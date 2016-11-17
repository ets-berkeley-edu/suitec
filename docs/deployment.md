# Deploy SuiteC

**WARNING:** The `deploy.sh` script performs `git reset --hard HEAD` which will wipe away un-stashed work. The script is intended for dev, qa and prod; not developer workstations.

Deploy SuiteC by branch or tag name:
```
cd ~

# Skip the next step if you have already cloned the Git repo
git clone git://github.com/ets-berkeley-edu/collabosphere.git

cd ~/collabosphere

# Deploy specified branch or tag and then start the server:
./deploy/deploy.sh [-r remote] [-b branch] [-t tag]

# You are done. Time to smoke-test the running application.
```

For complete usage information, with examples, run the script with no args:
```
./deploy/deploy.sh
```

Have a nice day!
