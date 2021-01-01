# Lucille Bot

## How to set up a development environment
This is a quick and easy quide to get Lucille up and running ready for development!
### Clone the repository
```bash
git clone https://github.com/MikeDev96/lucille-bot.git
```
### Create a config.json file in the root folder.
Populate it with the following skeleton config:
```json
{
  "discord": {
    "token": "",
    "authorAvatarUrl": "https://i.imgur.com/Wh0dLdM.png",
    "owner": "155065678318141440",
    "footer": "Created with ♥ by ME, JC, JK, DM and JW - Powered by Keef Web Services",
    "prefix": ";"
  },
  "spotify": {
    "clientId": "",
    "clientSecret": ""
  },
  "tidal": {
    "token": ""
  },
  "soundCloud": {
    "clientId": ""
  },
  "aws": {
    "accessKeyId": ""
  },
  "aoc": {
    "cookie": ""
  },
  "tenor": {
    "key": ""
  }
}
```
> Certain features won't work without credentials provided in the config.json
For example, converting Spotify links to Tidal won't work as both of their corresponding credentials are missing.

### Create a .env file in the root folder.
Populate it with the following:
```
YOUSYNC_API_URL = "http://yousync.mikedev.uk"
YOUSYNC_URL = "http://yousync.mikedev.uk"
PUBLIC_URL = http://lucille.mikedev.uk
PORT = 3000
```

- `YOUSYNC_API_URL` is called by the `yousync` command to create a room and optionally prepopulate it with a video.
- `YOUSYNC_URL` is used by the `yousync` command to generate a link to the created room.
- `PUBLIC_URL` is the endpoint used by the `Reddit Ripper` to host ripped video files.
- `PORT` same as `PUBLIC_URL` but the port.

### Install dependencies
Use `npm ci` to install the Node dependencies so that you don't end up with a different package-lock.json

### Good to go
You should now be good to go, run `npm start` to get going!

---

## Add bot to server
Replace the `client_id` param with your bot's client id and open the link.
https://discordapp.com/oauth2/authorize?&client_id=000000000000000000&scope=bot&permissions=8