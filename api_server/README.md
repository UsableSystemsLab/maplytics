## Usage

- When installing a new npm package, please run the following command:

```shell
# Install the package locally so that we update package.json and package-lock.json
npm install <package_name>
docker exec api_server_container npm install <package_name>
```

- If you wish to restart the container, please run the following command:

```shell
docker restart api_server_container
```
