# MangaVault --- Story Research Studio

A self-hosted manga library and PDF-generation web app designed to run
on an Android phone using **Termux**. Your phone runs the server; you
access the interface from a browser on the same phone or another device.

This guide is written for anyone cloning this repository and setting up
their own MangaVault server.

> **Important:** MangaVault's source-site integrations can change when
> third-party websites change. Use it only for content you own or are
> authorized to download, and follow the source website's terms.

------------------------------------------------------------------------

## Contents

-   [What you need](#what-you-need)
-   [Install Termux](#1-install-termux)
-   [Prepare your phone](#2-prepare-your-phone)
-   [Download MangaVault from
    GitHub](#3-download-mangavault-from-github)
-   [Install project dependencies](#4-install-project-dependencies)
-   [Start your server](#5-start-your-server)
-   [Open MangaVault](#6-open-mangavault)
-   [Use it from another device](#7-use-it-from-another-device)
-   [Stop the server](#8-stop-the-server)
-   [Start it again later](#9-start-it-again-later)
-   [Update MangaVault](#10-update-mangavault)
-   [Find your downloaded PDFs](#11-find-your-downloaded-pdfs)
-   [Troubleshooting](#troubleshooting)
-   [Security and responsible use](#security-and-responsible-use)

## What you need

-   An Android phone with enough free storage for downloaded pages and
    PDFs.
-   Termux installed on the phone.
-   A stable internet connection for setup and downloads.
-   A modern browser such as Chrome or Brave.
-   Basic familiarity with copying commands into Termux.

**Your phone is the server.** It must remain powered on, connected to
the internet, and running Termux while you access MangaVault.

## 1. Install Termux

Install Termux from a trusted source. The F-Droid distribution or the
official Termux GitHub releases are generally preferred over the
outdated Play Store build.

-   F-Droid: https://f-droid.org/packages/com.termux/
-   Official project: https://github.com/termux/termux-app

Open Termux after installation.

## 2. Prepare your phone

Update Termux packages:

``` bash
pkg update -y && pkg upgrade -y
```

Install the system tools used by the project:

``` bash
pkg install -y git nodejs python python-pillow cloudflared
```

Grant Termux access to shared phone storage:

``` bash
termux-setup-storage
```

When Android displays the permission prompt, tap **Allow**.

Install the Python PDF library:

``` bash
pip install pypdf
```

If pip reports that the environment is externally managed, do not force
an unsafe system-wide install. Check whether your Termux repository
provides a compatible package:

``` bash
pkg search pypdf
```

## 3. Download MangaVault from GitHub

Clone the public repository. This downloads the project into a folder
named `MangaVault` in your Termux home directory:

``` bash
cd ~
git clone https://github.com/RAHULDHEVADE/MangaVault-.git MangaVault
```

Enter the project folder:

``` bash
cd ~/MangaVault
```

You should now be inside the downloaded project.

## 4. Install project dependencies

First, check whether the repository contains a `package.json` file:

``` bash
ls
```

If `package.json` exists, install the dependencies declared by the
project:

``` bash
npm install
```

If this repository version does not contain a `package.json`, install
Express explicitly:

``` bash
npm install express
```

Do not run both installation methods unnecessarily. Use the method that
matches the files in the version you cloned.

Check that the startup script exists:

``` bash
ls -l start.sh
```

If `start.sh` is present, make it executable:

``` bash
chmod +x start.sh
```

## 5. Start your server

From inside `~/MangaVault`, run:

``` bash
./start.sh
```

The startup script should start the Node.js application and, if
configured in that version, the Cloudflare Tunnel.

Keep the Termux session open. Read the terminal output and note the
address it prints.

If the script says that a command is missing, install the missing
dependency using the relevant installation instructions above.

## 6. Open MangaVault

There are two common ways to access the app:

### Option A --- On the same phone

Open the local address printed by the server in your browser. It may be
a localhost address such as:

``` text
http://127.0.0.1:3000
```

Use the exact local address and port printed by your running server; the
example above is not guaranteed to match every version.

### Option B --- Through the Cloudflare Tunnel

If `start.sh` starts `cloudflared`, it should print a public HTTPS URL
similar to:

``` text
https://example-name.trycloudflare.com
```

Open the exact URL printed in your Termux session. A Quick Tunnel URL is
temporary and may change when the tunnel is restarted.

If no public URL appears, check the terminal output and confirm that
`cloudflared` is installed and that the startup script is configured to
launch it.

## 7. Use it from another device

To access your phone-hosted MangaVault from a laptop or another phone:

1.  Start MangaVault on the Android phone.
2.  Keep Termux running.
3.  Use the Cloudflare HTTPS URL printed by `start.sh`.
4.  Open that URL in the other device's browser.

Do not share the public URL casually. Anyone who obtains it may be able
to reach the login page.

## 8. Stop the server

Return to the Termux session where `start.sh` is running and press:

``` text
Ctrl + C
```

This is the preferred way to stop the app and tunnel started in that
session.

If the processes remain running, inspect them:

``` bash
pgrep -af 'node|cloudflared'
```

Then stop only the relevant process using its PID:

``` bash
kill <PID>
```

Replace `<PID>` with the process ID shown by the previous command. Avoid
killing every Node.js process if you use other Node projects on your
phone.

## 9. Start it again later

You do not need to clone the repository again. Open Termux and run:

``` bash
cd ~/MangaVault
./start.sh
```

If you closed the terminal or restarted your phone, start the server
again using these commands.

## 10. Update MangaVault

Stop the running server first. Then run:

``` bash
cd ~/MangaVault
git pull origin main
npm install
```

If the repository version has no `package.json`, skip `npm install`
unless the project instructions say otherwise.

Back up your `uploads/` folder before updating. It may contain your
downloaded PDFs, temporary files, or local JSON library data.

If Git reports local changes or a merge conflict, do not use
`git reset --hard` unless you intentionally want to discard those
changes.

## 11. Find your downloaded PDFs

The project is configured to store generated files under:

``` text
~/MangaVault/uploads/
```

To copy PDFs into the Android Downloads folder:

``` bash
mkdir -p ~/storage/shared/Download
cp ~/MangaVault/uploads/*.pdf ~/storage/shared/Download/
```

If no PDF files exist yet, the copy command may report that it cannot
find matching files.

You can also open the Android Files app and browse to the Termux
home/project storage location using a file manager that supports it.

------------------------------------------------------------------------

## Troubleshooting

### `Permission denied` when running `./start.sh`

Run:

``` bash
cd ~/MangaVault
chmod +x start.sh
./start.sh
```

### `git: command not found`

Install Git:

``` bash
pkg install git -y
```

### `node: command not found` or `npm: command not found`

Install Node.js:

``` bash
pkg install nodejs -y
```

### `python: command not found`

Install Python:

``` bash
pkg install python -y
```

### Pillow import or image-processing error

Install the Termux Pillow package:

``` bash
pkg install python-pillow -y
```

### `No module named pypdf`

Try:

``` bash
pip install pypdf
```

If Termux blocks the installation because of its managed Python
environment, check for a Termux package:

``` bash
pkg search pypdf
```

### `Cannot find module 'express'`

From the project folder, run:

``` bash
cd ~/MangaVault
npm install express
```

If a `package.json` exists, prefer:

``` bash
npm install
```

### The website does not open

-   Confirm that `./start.sh` is still running.
-   Check the terminal for the local address and port.
-   Use the exact URL printed by the server.
-   If using a tunnel, confirm that `cloudflared` is running.
-   Keep Termux open; Android may stop background processes to save
    battery.

### Cloudflare URL is not printed

Confirm that Cloudflare Tunnel is installed:

``` bash
cloudflared --version
```

Then inspect the output from `start.sh`. The script must be configured
to start a tunnel; installing `cloudflared` alone does not create a
public URL.

### Downloads or PDF creation fail

Check the Termux terminal for the actual error. Confirm that Node.js,
Python, Pillow, and pypdf are installed, that the phone has free
storage, and that the source page is still accessible.

------------------------------------------------------------------------

## Security and responsible use

-   Change any default login password before making the server reachable
    from the internet.
-   Do not publish passwords, API keys, cookies, session secrets, or
    private configuration files to GitHub.
-   Do not commit your personal `uploads/` folder or downloaded PDFs.
-   A Cloudflare Tunnel exposes your local service through a public URL.
    Use authentication and share the URL only with people you trust.
-   A temporary Cloudflare Quick Tunnel URL can change after a restart.
-   Only download content you own or have permission to access. Respect
    copyright and each source website's terms.
-   Keep backups of important PDFs and local library data.

## Project repository

**GitHub:** https://github.com/RAHULDHEVADE/MangaVault-

If this project helps you, consider starring the repository and
reporting reproducible bugs with the error message and steps to
reproduce.

------------------------------------------------------------------------

*This guide is based on the current documented Termux workflow.
Commands, dependencies, ports, login behavior, and tunnel behavior can
change as the project evolves. Always check the actual files in the
version you cloned, especially `start.sh` and `package.json`.*
