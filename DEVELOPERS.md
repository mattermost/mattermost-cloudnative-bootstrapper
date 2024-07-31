
# Contribute to Mattermost CloudNative Bootstrapper

Thank you for your interest in contributing to the Mattermost CloudNative Bootstrapper! This document outlines how to set up your development environment and run the server and web application.

## Table of Contents

- [Contribute to Mattermost CloudNative Bootstrapper](#contribute-to-mattermost-cloudnative-bootstrapper)
  - [Table of Contents](#table-of-contents)
  - [Run the Server](#run-the-server)
  - [Run the Webapp](#run-the-webapp)
  - [State Files](#state-files)
    - [Custom State File Location](#custom-state-file-location)
  - [General Guidelines](#general-guidelines)

## Run the Server

To run the backend server, follow these steps:

1. **Install the Go dependencies**: From the root directory of the repository, run the following command to install all necessary dependencies:

   ```bash
   go install ./...
   ```

2. **Start the server**: Use the following command to run the server:

   ```bash
   mcnb server
   ```

The server will start and listen for requests.

## Run the Webapp

To run the frontend web application, follow these steps:

1. **Navigate to the webapp directory**:

   ```bash
   cd webapp
   ```

2. **Install the Node.js dependencies**: Run the following command to install the required packages:

   ```bash
   npm install
   ```

3. **Start the web application**: Use the following command to run the web app:

   ```bash
   npm start
   ```

The Bootstrapper UI will be available at [http://localhost:3000](http://localhost:3000).

## State Files

The Mattermost CloudNative Bootstrapper (aka MCNB) uses a state file that it stores by default at `~/.mcnb/state.json`. This state file contains important information about the current configuration and status of your bootstrapper instance.

### Custom State File Location

If you need to override the default location of the state file, you can do so by using the following command when running the server:

```bash
mcnb server --state-file-path=<full_path_to_file>
```

This allows you to specify a custom path for the state file, ensuring that your setup can accommodate different environments or configurations as needed.

**NOTE**: MCNB must have write access to the directory where the state file exists in order to be able to persist your configuration between server restarts.

## General Guidelines

- Please ensure your code follows the project's coding conventions and style guidelines.
- Write clear and concise commit messages that describes your changes.
- Test your changes thoroughly before submitting a pull request.
- Make sure to open an issue for discussion before starting work on a large feature or change.

Thank you for contributing to Mattermost CloudNative Bootstrapper! We appreciate your help in making this project better for everyone.
