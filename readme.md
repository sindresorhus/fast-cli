# fast-cli

> Test your download and upload speed using [fast.com](https://fast.com)

![](screenshot.gif)

## Install

Ensure you have [Node.js](https://nodejs.org) version 12.20+ installed. Then run the following:

```
$ npm install --global fast-cli
```

## Usage

```
$ fast --help

  Usage
    $ fast
    $ fast > file

  Options
    --upload, -u   Measure upload speed in addition to download speed
    --single-line  Reduce spacing and output to a single line

  Examples
    $ fast --upload > file && cat file
    17 Mbps
    4.4 Mbps

    $ fast --upload --json
```

##### Upload speed

<img src="screenshot-upload.gif" width="500" height="260">

## Links

- [Product Hunt submission](https://www.producthunt.com/posts/fast-cli-2)

## Related

- [speed-test](https://github.com/sindresorhus/speed-test) - Test your internet connection speed and ping using speedtest.net
