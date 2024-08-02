# [![Mattermost CloudNative Bootstrapper](https://user-images.githubusercontent.com/7205829/137170381-fe86eef0-bccc-4fdd-8e92-b258884ebdd7.png)](https://mattermost.com)

<!-- TODO: Replace link to proper page when one exists -->
[Mattermost CloudNative Bootstrapper](https://mattermost.com) is an open-source tool designed to simplify the deployment and management of Mattermost on Kubernetes clusters. Built with Go and React, this tool provides a user-friendly interface for creating and connecting to existing Kubernetes clusters, whether via AWS EKS or custom configurations like Kubecfg. Each installation is released under the MIT license.

[Get started with Mattermost CloudNative Bootstrapper](https://community.mattermost.com/signup_user_complete/?id=codoy5s743rq5mk18i7u5ksz7e) by joining the discussion on Mattermost's Community server.

<!-- TODO: Replace with proper image -->
<!-- <img width="1006" alt="Mattermost CloudNative Bootstrapper UI" src="https://user-images.githubusercontent.com/yourimagepath/ui-screenshot.png"> -->

### Key Features

- **Cluster Management**: Create or connect to existing Kubernetes clusters easily.
- **Utility Installation**: Installs essential utilities via `helm`, including the Mattermost Operator, Nginx Ingress Operator, and CloudNativePostgres Operator.
- **Workspace Management**: Create and manage multiple Mattermost workspaces from a single dashboard.
- **Database Flexibility**: Connect to any existing database type or create in-cluster databases using the CloudNativePostgres Operator.
- **Storage Options**: Utilize an existing S3 bucket for file storage or set up local PVCs for each workspace.

All from one simple React application that packages all necessary dependencies within itself (no external CLI tools like `kubectl` or `helm` required!)

## Table of Contents

- [](#)
    - [Key Features](#key-features)
  - [Table of Contents](#table-of-contents)
  - [Install Mattermost CloudNative Bootstrapper](#install-mattermost-cloudnative-bootstrapper)
    - [Installation Guides:](#installation-guides)
  - [Key Use Cases](#key-use-cases)
  - [Resources](#resources)
  - [Get Involved](#get-involved)
  - [Contribute](#contribute)
  - [Get the latest news](#get-the-latest-news)

## Install Mattermost CloudNative Bootstrapper

<!-- TODO: replace this link with the release page when ready -->
- [Download and Install](./DEVELOPERS.md) - Deploy Mattermost CloudNative Bootstrapper to set up your Kubernetes environment in minutes.
- [Developer Setup](./DEVELOPERS.md) - Follow this guide if you want to contribute to the Bootstrapper.

### Installation Guides:

- [Deploy Mattermost on AWS EKS](https://docs.mattermost.com/install/install-eks.html)
- [Using Kubecfg](https://docs.mattermost.com/install/install-kubecfg.html)
- [Helm Installation](https://docs.mattermost.com/install/install-helm.html)

## Key Use Cases

- **Multi-Workspace Management**: Efficiently create and manage multiple Mattermost workspaces, using a gold-standard deployment, driven by our expertise in hosting Mattermost in the Cloud.
- **Cloud-Native Deployments**: Streamline your deployment processes and harness the power of Kubernetes to bring immense stability to your deployments.
- **Seamless Database Integration**: Flexibly connect to or create databases for your Mattermost instances.

## Resources

<!-- TODO: fill in when ready -->
<!-- - [Product Documentation](https://docs.mattermost.com/) - Comprehensive guides on how to use the Mattermost CloudNative Bootstrapper and related tools. -->
- [Developer Documentation](https://developers.mattermost.com/) - Contribute to the Bootstrapper or explore integration options via APIs.


<!-- TODO: Add license section -->
<!-- ## License

This project is licensed under the MIT License. See the [LICENSE file](LICENSE.txt) for details. -->

## Get Involved

- [Contribute to Mattermost](https://handbook.mattermost.com/contributors/contributors/ways-to-contribute)
- [Join Discussions](https://community.mattermost.com/signup_user_complete/?id=f1924a8db44ff3bb41c96424cdc20676)
- [Get Help](https://docs.mattermost.com/guides/get-help.html)

## Contribute

Please see [DEVELOPERS.md](./DEVELOPERS.md) for guidelines on how to contribute. Join the [Mattermost Contributors server](https://community.mattermost.com/signup_user_complete/?id=codoy5s743rq5mk18i7u5ksz7e) to engage in discussions about development and contributions.

## Get the latest news

- **X** - Follow [Mattermost on X, formerly Twitter](https://twitter.com/mattermost).
- **Blog** - Get the latest updates from the [Mattermost blog](https://mattermost.com/blog/).
- **Facebook** - Follow [Mattermost on Facebook](https://www.facebook.com/MattermostHQ).
- **LinkedIn** - Follow [Mattermost on LinkedIn](https://www.linkedin.com/company/mattermost/).
- **Email** - Subscribe to our [newsletter](https://mattermost.us11.list-manage.com/subscribe?u=6cdba22349ae374e188e7ab8e&id=2add1c8034) (1 or 2 per month).
- **Mattermost** - Join the ~contributors channel on [the Mattermost Community Server](https://community.mattermost.com).
- **IRC** - Join the #matterbridge channel on [Freenode](https://freenode.net/) (thanks to [matterircd](https://github.com/42wim/matterircd)).
- **YouTube** -  Subscribe to [Mattermost](https://www.youtube.com/@MattermostHQ).
