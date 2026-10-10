# Contributing to TactiLens

Read the [foundation audit](docs/tactilens/FOUNDATION_AUDIT.md), [architecture](docs/tactilens/ARCHITECTURE.md) and [implementation plan](docs/tactilens/IMPLEMENTATION_PLAN.md) first. The repository is in its foundation phase; agree implementation scope with the maintainer before starting a new subsystem.

## A focused contribution

1. Describe the problem, existing behavior and proposed outcome in an issue or PR.
2. Reuse existing data and domain behavior. Keep desktop routes, analyst streaming and PDF exports compatible.
3. Keep the change on a dedicated branch. Include tests for changed behavior and report limitations honestly.
4. Run `npm run test`, `npm run build` and `npm run lint`; distinguish existing failures from new ones.
5. Update the relevant documentation and hackathon change record with actual evidence.

Never commit credentials, private match footage or material without usage rights. Mark synthetic fixtures explicitly. Do not describe generated narrative or keyword visualizations as verified evidence.

The project license is pending. Resolve licensing expectations with the maintainer before contributing substantive code or third-party assets.
