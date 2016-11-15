# Configuring SuiteC

SuiteC uses [node-config](https://github.com/lorenwest/node-config) to manage a hierarchical organization of configuration files.
It lets you define a set of default parameters, and extend them for different deployment environments (development, qa, staging, production, etc.).
Configurations are stored in configuration files within the application, and can be overridden and extended by environment variables, command line parameters, or external sources.

## Configuration directory

Node-config reads configuration files in the `./config` directory for the running process. This can be overridden by setting the `$NODE_CONFIG_DIR` environment variable to the directory containing your configuration files.
`$NODE_CONFIG_DIR` can be a full path from the root directory, or a relative path from the process if the value begins with `./` or `../`.

## Configuration File Load Order

Files in the config directory are loaded in the following order:

```
default.EXT
default-{instance}.EXT
{deployment}.EXT
{deployment}-{instance}.EXT
{hostname}.EXT
{hostname}-{instance}.EXT
{hostname}-{deployment}.EXT
{hostname}-{deployment}-{instance}.EXT
```

where

- `EXT` can be `.yml`, `.yaml`, `.coffee`, `.cson`, `.properties`, `.json`, `.json5`, `.hjson` or `.js`. SuiteC uses `.json` as the default format.
- `{instance}` is an optional instance name string for multi-instance deployments
- `{hostname}` is tge server name, from the `$HOST` or `$HOSTNAME` environment variable or `os.hostname()`
- `{deployment}` is the deployment name, from the `$NODE_ENV` environment variable

## SuiteC Configuration Options

SuiteC allows the following values to be configured:

### `app` configuration

- `port`: The internal port on which the SuiteC app server should listen

### `db` configuration

- `database`: The name of the Postgres database SuiteC should use
- `username`: The username with which SuiteC should connect to the Postgres database
- `password`: The password with which SuiteC should connect to the Postgres database
- `host`: The host at which SuiteC can connect to the Postgres database
- `port`: The port at which SuiteC can connect to the Postgres database
- `dropOnStartup`: Whether SuiteC should drop all existing database data when restarting the app server. CAUTION: This should never be enabled in a production environment.

### `log` configuration

SuiteC uses [node-bunyan](https://github.com/trentm/node-bunyan) for managing application logging. Node-bunyan will log all messages in JSON format.

- `level`: The logging level at which SuiteC should log messages. SuiteC will log all messages at or above the configured logging level. See [node-bunyan](https://github.com/trentm/node-bunyan#levels) for additional information about the available levels
- `stream`: `stdout` if SuiteC should log to the standard output stream. Otherwise, this should be the path to the log file to which SuiteC should log
