/**
 * api:
 *      IRC([required options])
 *          required options - {name, pass, channel}
 *
 *      IRC.connect()
 *          connects to the twitch irc server
 *
 *      IRC.on('command', callback)
 *          allows custom commands
 *
 *      IRC.on('data', callback)
 *          event when data is recieved / sent
 *
 *      IRC.msg(message, [options])
 *          options - {caller, auth[0/1]}
 *
 *      IRC.caller(data[0])
 *          parse out user name from socket data,
 *          mainly for plugin use when working with commands
 *
 * example:
 *      require:
 *          var irc = require('./lib/core/irc.js')({
 *              name    : 'TwitchBot',
 *              pass    : 'twitch!twitch!twitch!',
 *              channel : '#awesomebroadcaster'
 *          });
 *
 *      connect:
 *          irc.connect();
 *
 *      custom commands:
 *          irc.on('command' function (data) {
 *              if (data[3] == ':!command') {
 *                  // do something
 *              }
 *          });
 *
 *      irc data:
 *          irc.on('data', function (data) {
 *              //do something with data
 *          });
 *
 *      irc logging:
 *          irc.on('data', function (data) {
 *              irc.realtime(data);
 *          }
 *
 *      send a message to chat:
 *          irc.msg('Hi chat!');
 *          irc.msg('Hi chat!', {caller: 'aataxe', auth: 1});
 *
 *      get user name:
 *          irc.caller(data[0]);
 */

var net = require('net'),
    events = require('events'),
    file = require('fs'),
    https = require('https'),
    utils = require('./utils.js');

//-------- Construct ---------
function IRC(options) {
    var __self = this;

    __self.options = options || {pass: 'irc_bot', name: 'irc_bot', channel: 'irc_bot'};

    __self.config = {
        // twitch bot info
        pass        : __self.options.pass,
        name        : __self.options.name,
        nick        : 'irc_bot',
        broadcaster : __self.options.channel.slice(1).charAt(0).toUpperCase() + __self.options.channel.slice(2).toLowerCase(),
        // twitch server
        addr        : '199.9.250.229', //__self.options.name.toLowerCase() + '.jtvirc.com',
        port        : 6667,
        channel     : __self.options.channel.toLowerCase(),
        encoding    : 'ascii'
    };

    __self.mods = [];
    __self.buffer = [];

    // message queue
    __self.queue_timer = 2000;
    __self.queue_messages = [];
    __self.previous_message = '';

    // irc logging
    __self.check_streaming = 4;//minutes
    __self.streaming = false;
    __self.new_file = false;
    __self.log = '';
}

IRC.prototype = new events.EventEmitter();

//-------- Methods --------
IRC.prototype.start = function () {
    var __self = this;

    // check stream status
    function stream_status() {
        var time = utils.make_interval(__self.check_streaming);
        if (time === 0) {
            https.get('https://api.twitch.tv/kraken/streams/' + __self.config.channel.slice(1), function (response) {
                var body = '';

                // put together response
                response.on('data', function (chunk) {
                    body += chunk;
                });

                // log file creation
                response.on('end', function () {
                    var json = JSON.parse(body);
                    __self.streaming = json.stream !== null;
                    if (__self.streaming && !__self.new_file) {
                        // prevent another file from being created while streaming
                        __self.new_file = true;

                        // set stream time for file
                        var date = new Date(),
                            hours = date.getHours() < 10 ? '0' + date.getHours() : date.getHours(),
                            min = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes(),
                            sec = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds(),
                            streaming_time = '';

                        // create start time string
                        streaming_time += (date.getMonth().toString() + 1) + date.getDate().toString() + date.getFullYear().toString();
                        streaming_time += hours.toString() + min.toString() + sec.toString();

                        // create new log file
                        __self.log = './../logs/' + __self.config.channel.slice(1) + '_' + streaming_time.toString() + '.txt';
                        file.open(__self.log, 'w');
                    } else if (!__self.streaming) {
                        __self.new_file = false;
                    }
                    setTimeout(stream_status, 1000);
                });
            });
        } else {
            setTimeout(stream_status, time);
        }
    }

    stream_status();
    __self.connect();
    __self.monitor_queue();
};

IRC.prototype.realtime = function (data){
    var __self = this;

    // only log irc data if streaming
    if (__self.streaming) {
        // check if file exists, if it does append
        file.exists(__self.log, function (exists) {
            if (exists) {
                file.appendFile(__self.log, data + '\r\n', 'utf-8', function (err) {
                    if (err) {
                        throw err;
                    }
                });
            }
        });
    }
};

IRC.prototype.connect = function () {
    var __self = this;

    // create new socket
    __self.socket = new net.Socket();
    __self.socket.setEncoding(__self.config.encoding);
    __self.socket.setNoDelay();
    __self.socket.connect(__self.config.port, __self.config.addr);

    // connect to twitch irc via socket
    __self.socket.on('connect', function () {
        __self.emit('data', 'RECV - Established connection to Twitch IRC, registering user...');
        __self.raw('PASS ' + __self.config.pass, true);
        __self.raw('NICK ' + __self.config.name);
        __self.raw('USER ' + __self.config.nick + ' ' + __self.config.nick + '.com ' + __self.config.nick + ' :' + __self.config.name);
    });

    // handle incoming socket data
    __self.socket.on('data', function (data) {
        var prepack, lines, line, word;
        prepack = data.replace('\r\n', '\n');
        __self.buffer += prepack;
        lines = __self.buffer.split('\n');
        __self.buffer = '';

        if (lines[lines.length - 1] !== '') {
            __self.buffer = lines[lines.length - 1];
        }

        lines = lines.splice(0, lines.length - 1);
        for (var i = 0; i < lines.length; i++) {
            line = lines[i].replace('\r','');
            word = line.replace('\r', '').split(' ');
            __self.emit('data', 'RECV - ' + line);
            __self.join(word);
            __self.pingpong(word);
            __self.moderators(word);
            if (word[3] !== undefined) {
                __self.emit('command', word);
            }
        }
    });

    __self.socket.on('error', function(){
        __self.reconnect();
    });
};

// reconnect to socket
IRC.prototype.reconnect = function () {
    var __self = this;

    // send quit to server, destroy socket connection,
    // clear socket variable and then reconnect
    __self.socket.end('QUIT\r\n');
    __self.socket.destroy();
    __self.socket = null;
    __self.connect();
};

// join channel
IRC.prototype.join = function (data) {
    var __self = this;

    if (data[3] === ':End') {
        __self.raw('JOIN ' + __self.config.channel);
    }
};

// ping / pong
IRC.prototype.pingpong = function (data) {
    var __self = this;

    if (data[0] === 'PING') {
        __self.raw('PONG ' + data[1]);
    }
};

// store / remove mods
IRC.prototype.moderators = function (data) {
    var __self = this;

    if (data[1] === 'MODE') {
        if (data[4] !== undefined) {
            var user = data[4].charAt(0).toUpperCase() + data[4].slice(1);
            switch (data[3]) {
            case '+o':
                if (__self.mods.indexOf(user) < 0) {
                    __self.mods.push(user);
                }
                break;
            case '-o':
                if (__self.mods.indexOf(user) >= 0) {
                    __self.mods.splice(__self.mods.indexOf(user), 1);
                }
                break;
            }
        }
    }
};

// output to socket / console
IRC.prototype.raw = function (data, hide) {
    var __self = this;

    __self.socket.write(data + '\r\n', __self.config.encoding, function (){
        if (!hide) {
            // monitor commands sent by the bot
            // and push them to command action
            var parse = data.split(' ');
            if (parse[0] === 'PRIVMSG') {
                parse = __self.options.name + ' ' + data;
                __self.emit('command', parse.split(' '));
                __self.emit('data', 'SENT - ' + __self.options.name + ' ' + data);
            } else {
                // output response
                __self.emit('data', 'SENT - ' + data);
            }
        }
    });
};

// who sent message
IRC.prototype.caller = function (data) {
    var caller = data.split('!');

    return caller[0].charAt(1).toUpperCase() + caller[0].slice(2);
};

// send message to twitch chat
IRC.prototype.msg = function (msg, options) {
    var __self = this, opts = options || {caller:null, auth:0};

    switch (opts.auth) {
    case 0:
        __self.raw('PRIVMSG ' + __self.config.channel + ' :' + msg);
        break;
    case 1:
        if (__self.mods.indexOf(opts.caller) >= 0) {
            __self.raw('PRIVMSG ' + __self.config.channel + ' :' + msg);
        }
        break;
    }
};

// message queue
IRC.prototype.queue = function(msg) {
    var __self = this;
    __self.queue_messages.push(msg);
};

IRC.prototype.monitor_queue = function() {
    var __self = this, prepend_text = ['>', '+'];

    // handle messages in queue
    function handle_queue() {
        if (__self.queue_messages.length > 0) {
            var message = __self.queue_messages[0].message,
                options = __self.queue_messages[0].options,
                timer   = __self.queue_messages[0].timer || __self.queue_timer;

            // change message if it's the same as the previous message
            if (message === __self.previous_message) {
                for (var i = 0; i < prepend_text.length; i++) {
                    if (prepend_text[i] !== message.charAt(0)) {
                        message = prepend_text[i] + message.slice(1);
                        __self.previous_message = message;
                        break;
                    }
                }
            } else {
                __self.previous_message = __self.queue_messages[0].message;
            }

            // remove message from queue
            __self.queue_messages.splice(0, 1);

            // output message to chat
            setTimeout(function() {
                if (options === null) {
                    __self.msg(message);
                } else {
                    __self.msg(message, options);
                }
                // recheck the queue
                setTimeout(handle_queue, 500);
            }, timer);
        } else {
            setTimeout(handle_queue, 500);
        }
    }
    handle_queue();
};

module.exports = function (options) {
    return new IRC(options);
};