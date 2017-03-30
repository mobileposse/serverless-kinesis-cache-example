epx_dev
======

This directory allows you to bring up a development environment for testing node solutions which create AWS infrastructure and/or interact with cloud resources. If you have issues, please read [_when your environment breaks_](../README.md).

Requirements
------------

See the Vagrant directory README -- you will need Ansible, Vagrant and Virtualbox to work with the epx_dev environment.

epx_dev is configured to use 192.168.251.48. If you are already using this ip, you will need to resolve the conflict.

### Clone this Repository

The rest of this guide assumes that you're working within a clone of this repository. The examples use repository URLs based on connecting to GitHub with [SSH keys](https://help.github.com/articles/generating-ssh-keys), but feel free to swap out the URLs for their HTTPS counterparts.

Working on epx_dev
--------------------

### TL;DR

    $ git clone <repo git/http url>
    $ cd <project>
    $ cd vagrant/epx_dev
    $ vagrant up
    $ vagrant ssh

### AWS Configuration

Though you can use `aws configure`, the simple way to deal with AWS credentials is to add these lines to ~/.bash_profile (and restart your shell)...

```
export AWS_ACCESS_KEY_ID=<your-key-here>
export AWS_SECRET_ACCESS_KEY=<your-secret-here>
export AWS_ACCESS_KEY=<your-key-here>
export AWS_SECRET_KEY=<your-secret-here>
```

**Do not store AWS admin credentials in a github repo unless encrypted (.e.g. transcrypt). If your github account is compromised, then an attacker could create havok. If credentials are in frontend code, it makes little sense to encrypt them -- but such credentials must not have admin authority.**

Restart your shell, and test aws cli...

```
$ exec bash -l
$ aws ec2 --region us-west-2 describe-regions
```

### Memory Usage

By default, the development VM is configured to use 1024 MB of RAM. If you'd like to change that, simply export the `$EPX_MEMORY` environment variable with a string of your desired amount (in MB) before bringing up the machine:

    $ export EPX_MEMORY='2048'
    $ vagrant up
