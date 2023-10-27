# DEPRECATED ⛔️ LoyaltyBot

#### Deprecation Note:

**I wrote this bot ~10 years ago, man that feels like a lifetime! Features this bot provided have mostly been integrated into Twitch's own system called [channel points](https://help.twitch.tv/s/article/channel-points-guide). This was a fun experiment for me as I was really kicking off my coding journey, and the first real piece of software that actually saw some real world use. Thanks to everyone that used it a long long time ago, in that far away place that was Twitch ~2013.**

---

A TwitchTV viewer reward system

Written in JavaScript and Node

Overview
--------

LoyaltyBot is a chat bot that allows you to reward viewers with loyalty points for hanging out on your stream. It's
main purpose is to allow you, the broadcaster, to reward the viewers that are dedicated to watching your stream as
opposed to the viewers that just stop by for a quick giveaway and leave.

#### Features

- Fully functioning auction and raffle systems
- Double loyalty points for subscribers/loyal viewers

#### Extras

- Moderator commands (currently in development, semi functional)

#### Future Features/Extras

- Free subscriber/paid non-subscriber Jukebox (still in development)
- Stream title updates posted to twitter (still in development)

Basic Setup
-----------

example.js

````javascript
var loyaltybot = require('./../lib/initialize.js');

loyaltybot.initialize({
    // twitch info
    twitch : {
        channel     : 'loyalty',
        bot         : {name: 'LoyaltyBot', password: 'loyalty!loyalty!loyalty!'},
        subscribers : 'https://spreadsheets.google.com/feeds/list/****/od6/public/basic?alt=json'
    },

    // currency info
    currency : {
        name     : 'Points',
        payrate  : 15,
        host     : '127.0.0.1',
        user     : 'mysql_user',
        password : 'mysql_password',
        database : 'mysql_database',
        website  : 'http://www.loyaltypoints.com'
    },

    // optional features
    commands: true
});
````

Configuration Options
---------------------
Twitch

- ````channel````: the channel name (in lower case)
- ````bot.name````: the account name of the bot
- ````bot.password````: the password for the bot
- ````subscribers````: a google doc that contains subscriber names (more info on this later)

Currency

- ````name````: custom name for the loyalty points
- ````payrate````: how often to hand out loyalty points (in minutes)
- ````host````: mysql database hostname/ip
- ````user````: username for the mysql database
- ````password````: password for the mysql database
- ````database````: mysql database name
- ````website````: provides loyalty bot with an offsite location for checking currency. can also be and be an empty ````string````

Optional

- ````commands````: enable/disable the ability to use moderator commands. boolean: accepts ````true```` or ````false````

Preparing to Setup Your Channel's Bot
-------------------------------------

#### Create a new bot account

In order to use LoyaltyBot's features you will need to create a new [TwitchTV Account](http://www.twitch.tv/signup). You can name it anything
you wish, all you need to do is pass the username/password to ````bot.name```` and ````bot.password````

#### Create the subscriber/loyal viewer list on Google Docs

Since TwitchTV does not have subscriber information in their api, LoyaltyBot needs a way to obtain that information.
That's where [Google Docs](http://docs.google.com/) comes in.

In the following order:

- Create a new spreadsheet
- Set cell A1 as the header "Username"
- Subscriber names (must be lower case) will then be in column A starting in cell A2 and below
- Set the subscriber list to public and change the type to json

Side Notes:

- Even if you do not have a subscription button, you can still add loyal viewers to this list for the double loyalty point benefits.
- Why Google Docs and not the MySQL database? Simplicity. It's easier to manually update a google doc spreadsheet daily
then it is to update a MySQL table.


#### Setting up MySQL tables

LoyaltyBot stores all of the viewer info and moderator commands in a MySQL database and requires specifc table/field names.

LoyaltyBot takes care of all table creation, however if by some chance you need to manually setup the tables the following
contains information about them:

Viewer
- Table Name: ````viewers````
- Field Names: ````user```` [primary key, not null, varchar], ````points```` [not null, integer]

Commands
- Table Name: ````commands````
- Field Names: ````id```` [primary key, autoincrement, not null, integer], ````command```` [not null, text], ````text```` [not null, longtext], ````auth```` [default: 1, integer]

LoyaltyBot In Action
--------------------

ArcherBot - [Chiffre2435](http://www.twitch.tv/chiffre2435)  
CookieMonsterBot - [Minerva_dh](http://www.twitch.tv/minerva_dh)  
InternetBot - [Izlsnizzt](http://www.twitch.tv/izlsnizzt)  
KarmaBot - [itsfabiotime](http://www.twitch.tv/itsfabiotime)  
Knowledge_Bot - [Illicitmedia](http://www.twitch.tv/illicitmedia)  
XBucksBot - [Linexnick](http://www.twitch.tv/linexnick)  

If you're using LoyaltyBot send me a [twitch message](http://www.twitch.tv/message/compose?to=rvca18) so I can add you to this list!