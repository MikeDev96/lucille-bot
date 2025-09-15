# Lucille Bot

This is a quick and easy quide to get Lucille up and running ready for development!

## Bot creation
You can create a discord bot at [this url](https://discord.com/developers/applications/) 

Make sure you copy the bot token before it disapppears

When initially creating your bot, ensure that your bot has the approriate gateway intents, such as the "Message Content Intent" to read Discord messages

---

## How to set up a development environment
### Prerequisites
- **Windows Build Tools**  
Lucille uses SQLite which requires WBT.
Browse to your nodejs installation directory (usually here: C:\Program Files\nodejs)
Run install_tools.bat
This will install chocolatey, python & wbt.
- ** FFMPEG **
Make sure ffmpeg is available in path
### Clone the repository
```bash
git clone https://github.com/MikeDev96/lucille-bot.git
```

### Create a .env file in the root folder.
Populate it with the following skeleton config:
```
DISCORD_TOKEN = ""
DISCORD_AUTHORAVATARURL = ""
DISCORD_OWNER = ""
DISCORD_FOOTER = "Created with ♥ by ME"
DISCORD_PREFIX = ";"

SPOTIFY_CLIENTID = ""
SPOTFIY_CLIENTSECRET = ""

TIDAL_CLIENTID=""
TIDAL_CLIENTSECRET=""

TIDAL_TOKEN = ""

SOUNDCLOUD_CLIENTID = ""

TENOR_KEY = ""

SPEEDTEST_TOKEN = ""

YOUSYNC_API_URL = "http://yousync.mikedev.uk"
YOUSYNC_URL = "http://yousync.mikedev.uk"

# If using docker, supply config dir
CONFIG_DIR = /config
```

> Certain features won't work without credentials provided in the .env file.
For example, converting Spotify links to Tidal won't work if either of their corresponding credentials are missing.

### Install dependencies
Use `npm ci` to install the Node dependencies so that you don't end up with a different package-lock.json

### Linting
Install the ESLint extension in VS Code, open it's settings and enable 'Enables ESLint as a formatter'
This will now use the linting config provided in the repository.

![image](https://user-images.githubusercontent.com/8274829/147792939-bcfc47c0-4f3e-433f-9eed-4757b6abffe2.png)

Tell VS Code to auto format on save: https://www.aleksandrhovhannisyan.com/blog/format-code-on-save-vs-code-eslint/#automatically-formatting-code-on-save

### Good to go
You should now be good to go, run `npm start` to get going!

---

## How to host the bot
1. CD to somewhere you'd like to store a docker image
2. Clone the repo
3. Build the lucille docker image
    `docker build -t lucille .`
4. CD to somewhere you'd like to create the docker container
5. Create a docker-compose.yml file
6. Use this snippet as a starter
    ```yml
    services:
    lucille:
        image: lucille
        container_name: lucille
        restart: unless-stopped
        env_file:
        - .env
        volumes:
        - .:/config
    ```
7. Create a .env file, see above for more details
8. Run docker compose up -d
9. Done

---

## Add bot to server
Replace the `client_id` param with your bot's client id and open the link.
https://discordapp.com/oauth2/authorize?&client_id=000000000000000000&scope=bot&permissions=8

---

## Resources
This is useful to find BBC radio streams: https://en.everybodywiki.com/List_of_BBC_radio_stream_URLs