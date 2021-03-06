'use strict';

// I like ES2015, but old versions of Android don't. I'm far, far too lazy to set up Babel property so I'm just copy/pasting index.src.js into https://babeljs.io/repl and then pasting the result into index.js. 

document.addEventListener("deviceready", function () {
    var cache = [];
    var last_id = 0;

    var get_from_array = function get_from_array(n, a) {
        var item = null;

        if (n.type == 'notification') a.forEach(function (c) {
            if (c.type == 'notification' && c.url == n.url && c.text == n.text) {
                item = c;
            }
        });

        if (n.type == 'pm') a.forEach(function (c) {
            if (c.type == 'pm' && c.user == n.user) {
                item = c;
            }
        });

        return item;
    };

    var is_in_array = function is_in_array(n, a) {
        if (get_from_array(n, a)) return true;else return false;
    };

    var browser = cordova.InAppBrowser.open('https://robertsspaceindustries.com/spectrum', '_blank', 'location=no,zoom=no,hidden=yes,toolbar=no,mediaPlaybackRequiresUserAction=yes');

    browser.addEventListener("loadstop", function () {
        browser.show();
    });

    var is_paused = false;

    document.addEventListener('pause', function (e) {
        is_paused = true;

        // If current page is a PM, navigate to the homepage when paused.
        // Otherwise new-PM notifications on the active PM won't be triggered.
        browser.executeScript({ code: 'var f = function() {\n    if (window.location.pathname.startsWith(\'/spectrum/messages/member/\')) {\n        window.location.pathname = \'/spectrum\';\n    }\n}\nf()' });
    }, false);

    document.addEventListener('resume', function (e) {
        is_paused = false;

        cache.forEach(function (n) {
            cordova.plugins.notification.local.cancel(n._id);
        });
    }, false);

    cordova.plugins.notification.local.registerPermission(function (r) {
        return console.log('registerPermission got: ' + r);
    });

    cordova.plugins.notification.local.on('click', function (notification) {
        var data = JSON.parse(notification.data); // The notification plugin docs don't mention parsing, I think it's a bug.
        var type = data[0];
        var url = data[1];

        console.log('notification clicked - id: ' + notification.id + ' type: ' + type + ' url: ' + url);

        if (type == 'notification') {
            browser.executeScript({ code: 'var f = function () {\n    var button = document.querySelector(\'.actions > button.notifications\');\n\n    if (!button.classList.contains(\'on\')) {\n        // Notifications panel is closed, trigger it to open\n        button.click();\n    }\n    \n    var list = document.querySelector(\'#notifications > .notifications-main > .notifications-list\');\n    \n    list.childNodes.forEach((a) => {\n        if (a.href == \'' + url + '\') a.click();\n    });\n}\nf()' });
        } else if (type == 'pm') {
            browser.executeScript({ code: 'var f = function () {\n    var pms = document.querySelectorAll(\'div.private-lobbies > div.private-lobby\');\n    pms.forEach((pm) => {\n        var a = pm.querySelector(\'a.private-lobby-name\');\n        if (a.href == \'' + url + '\') a.click();\n    });\n}\nf();' });
        }
    });

    window.setInterval(function () {
        if (!is_paused) return;

        browser.executeScript({ code: '\nvar f = function () {\n    // Since Spectrum doesn\'t use HTML5 notifications, this does some ugly DOM scraping to get notifications.\n    var notifications = [];\n\n    var button = document.querySelector(\'.actions > button.notifications\');\n    \n    if (button.classList.contains(\'unread\')) {\n        if (!button.classList.contains(\'on\')) {\n            // Notifications panel is closed, trigger it to open\n            button.click();\n        }\n        \n        var list = document.querySelector(\'#notifications > .notifications-main > .notifications-list\');\n        \n        list.childNodes.forEach((a) => {\n            if (!a.classList.contains(\'unread\')) return;\n            \n            notifications.push({\n                type: \'notification\',\n                url: a.href,\n                text: a.querySelector(\'.item-text\').textContent\n            });\n        });\n    }\n    \n    // Check PMs for unread messages, generate notifications for them\n    var pms = document.querySelectorAll(\'div.private-lobbies > div.private-lobby\');\n    pms.forEach((pm) => {\n        if (pm.classList.contains(\'unread\')) {\n            var a = pm.querySelector(\'a.private-lobby-name\');\n            var count = pm.querySelector(\'div.count\').textContent;\n            \n            notifications.push({\n                type: \'pm\',\n                url: a.href,\n                user: a.textContent,\n                count: count\n            });\n        }\n    });\n\n    return notifications;\n}\nf()' }, function (ret) {
            var notifications = ret[0];

            if (notifications.length < 1) return;

            notifications.forEach(function (n) {
                // Show a notification for each new item
                if (!is_in_array(n, cache)) {
                    n.id = last_id;
                    last_id++;

                    if (n.type == 'notification') {
                        console.log('adding notification: ' + n.text + ' - ' + n.url);

                        cordova.plugins.notification.local.schedule({
                            id: n.id,
                            title: 'Spectrum',
                            text: n.text,
                            data: [n.type, n.url],
                            icon: 'file://res/icon-notification.png'
                        });
                    } else if (n.type == 'pm') {
                        console.log('adding pm notification: ' + n.user + ' - ' + n.url);

                        cordova.plugins.notification.local.schedule({
                            id: n.id,
                            title: 'Spectrum',
                            text: n.count + ' private message' + (n.count != 1 ? 's' : '') + ' from ' + n.user,
                            data: [n.type, n.url],
                            icon: 'file://res/icon-notification.png'
                        });
                    }

                    cache.push(n);
                } else if (n.type == 'pm') {
                    // Check if PM message count needs to be updated
                    var c = get_from_array(n, cache);

                    if (n.count != c.count) {
                        console.log('updating pm notification: ' + n.user + ' - ' + n.count);

                        cordova.plugins.notification.local.schedule({
                            id: n.id,
                            text: n.count + ' private message' + (n.count != 1 ? 's' : '') + ' from ' + n.user
                        });

                        c.count = n.count;
                    }
                }
            });

            cache.forEach(function (n, i) {
                // Cancel notifications for items no longer shown
                if (!is_in_array(n, notifications)) {
                    console.log('removing notification: ' + n.id + ' - ' + n.url);

                    cordova.plugins.notification.local.cancel(n._id);
                    cache.splice(i, 1);
                }
            });
        });
    }, 10 * 1000);
}, false);
