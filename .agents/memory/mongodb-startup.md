---
name: MongoDB Startup in Replit
description: MongoDB is not pre-installed; must be installed and started in workflow
---
**Rule:** Install via `installSystemDependencies({packages:["mongodb"]})` then start with:
```
mkdir -p /tmp/mongodb/data && mongod --dbpath /tmp/mongodb/data --port 27017 --fork --logpath /tmp/mongodb/mongo.log
```

**Why:** Replit NixOS doesn't ship MongoDB; /tmp/mongodb/data is the writable temp path.

**How to apply:** Backend API workflow command must prepend mongod start before uvicorn. Already configured in "Backend API" workflow.
