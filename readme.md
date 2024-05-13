# fast-cli

> Test your download and upload speed using [fast.com](https://fast.com)

![](screenshot.gif)

## Install

Ensure you have [Node.js](https://nodejs.org) 18+ installed. Then run the following:

```sh
npm install --global fast-cli
```

*This project uses Puppeteer under the hood. Most [install issues](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md) are related to that.*

## Usage

```
$ fast --help

  Usage
    $ fast
    $ fast > file

  Options
    --upload, -u   Measure upload speed in addition to download speed
    --single-line  Reduce spacing and output to a single line
    --json         JSON output

  Examples
    $ fast --upload > file && cat file
    17 Mbps
    4.4 Mbps

    $ fast --upload --json
```

##### Upload speed

<img src="screenshot-upload.gif" width="500" height="260">

##### JSON output

The speeds are in Mbps.

```sh
fast --upload --json
```

```json
{
	"downloadSpeed": 52,
	"uploadSpeed": 64,
	"downloaded": 270,
	"uploaded": 290,
	"latency": 9,
	"bufferBloat": 46,
	"userLocation": "Somewhere, NO",
	"userIp": "49.222.206.21"
}
```

## Related

- [speed-test](https://github.com/sindresorhus/speed-test) - Test your internet connection speed and ping using speedtest.net
