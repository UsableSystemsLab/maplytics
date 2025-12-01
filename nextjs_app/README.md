## Usage

- When installing a new npm package, run the following commands:

```shell
# Install the package locally to update package.json and package-lock.json
npm install <package_name>
# Then sync the container dependencies
docker exec nextjs npm ci
```

- To restart the container:

```shell
docker restart nextjs
```

#### Note:

Our Docker setup uses these volume configurations:
- `./nextjs_app:/app` - Bind mount: syncs host directory to container
- `/app/node_modules` - Anonymous volume: container-only storage  
- `/app/.next` - Anonymous volume: container-only storage

This setup lets us develop with live file changes while keeping separate node_modules for host and container environments. The anonymous volumes prevent the bind mount from overwriting the container's dependencies.