use strict;

_wrapper_check_notifications = function () {
    // Since Spectrum doesn't use HTML5 notifications, this does some ugly DOM scraping to get notifications.
    var notifications = [];

    var button = document.querySelector('.actions > button.notifications');
    
    if (button.classList.contains('unread')) {
        if (!button.classList.contains('on')) {
            // Notifications panel is closed, trigger it to open
            button.click();
        }
        
        var list = document.querySelector('#notifications > .notifications-main > .notifications-list');
        
        list.childNodes.forEach((a) => {
            if (!a.classList.contains('unread')) return;
            
            notifications.push({
                url: a.href,
                text: a.querySelector('.item-text').textContent
            });
        }
    }

    return notifications;
}

_wrapper_click_notification = function (url) {
    var button = document.querySelector('.actions > button.notifications');

    if (!button.classList.contains('on')) {
        // Notifications panel is closed, trigger it to open
        button.click();
    }
    
    var list = document.querySelector('#notifications > .notifications-main > .notifications-list');
    
    list.childNodes.forEach((a) => {
        if (a.href == url) a.click();
        return;
    });
}
