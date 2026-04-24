# Deployment Script Notes

Script: `scripts/deployment/deploy.ps1`

## Modes

- Full deploy:
  - `./scripts/deployment/deploy.ps1`
- Skip build (artifacts already built):
  - `./scripts/deployment/deploy.ps1 -SkipBuild`
- Frontend only:
  - `./scripts/deployment/deploy.ps1 -FrontendOnly`
- Backend only:
  - `./scripts/deployment/deploy.ps1 -BackendOnly`
- Incremental upload (manifest-based):
  - `./scripts/deployment/deploy.ps1 -Incremental`
- Fast deploy (incremental + quiet remote unzip):
  - `./scripts/deployment/deploy.ps1 -FastDeploy`
- Combine modes:
  - `./scripts/deployment/deploy.ps1 -FrontendOnly -FastDeploy -SkipBuild`

## What improved

- Build phase can be skipped safely when output artifacts exist.
- Frontend and backend can be deployed independently.
- Incremental mode uploads only changed files from built artifacts.
- Backend restart (`tmp/restart.txt`) happens only when backend changed.
- Optional quiet remote extraction reduces log noise and shell overhead.
- Script prints mode and timing information for build/deploy phases.

## Important behavior

- Incremental mode tracks local artifact hashes in:
  - `scripts/deployment/.deploy-manifest.json`
- First incremental deploy after this change will act like full upload.
- When files are deleted locally, incremental mode warns because remote stale-file cleanup is conservative.
- For full stale-asset cleanup on frontend, run a non-incremental deploy.
