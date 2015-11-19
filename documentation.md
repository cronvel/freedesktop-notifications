

# Freedesktop Notifications

This module provide a high-level API for *Freedesktop.org Notifications*, **allowing your program to display a nice
and unobstrusive notification popup.**

This works on all OS having a support for the spec *org.freedesktop.Notifications* (mostly Linux desktops: Gnome, KDE,
Enlightment, XFCE, etc).

This does **NOT** rely on *libnotify*, it deals directly with D-Bus.

Most node library providing *Freedesktop.org Notifications* are in fact spawning a new process, then executing the command
line utility *notify-send*, which is super-slow and does not provide all of *Freedesktop.org Notifications* features,
like buttons.



## Getting started!

This lib is super simple to use, here is the most common use-case:

```js
var notifications = require( 'freedesktop-notifications' ) ;

notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	icon: 'appointment-new' ,
} ).push() ;
```

This will display an unobstrusive notification popup with "Hello world!" as the title, and a body message featuring
italic and bold markup.

Note that the *org.freedesktop.Notifications* spec only support italic, bold and underline.
HTML link are said to be working, but they are not implemented at the moment (tested on the latest Gnome desktop).

Also note that *icon* can be either a full path to an image, or a stock image existing on your desktop environment.

Here another example featuring **buttons** and **event listeners**:

```js
var notifications = require( 'freedesktop-notifications' ) ;

var notif = notifications.createNotification( {
	summary: 'Hello world!' ,
	body: 'This is a <i>Hello world</i> sample code. <b>Thanks for your attention...</b>' ,
	icon: __dirname + '/log.png' ,
	"sound-file": __dirname + '/hiss.wav' ,
	actions: {
		default: '' ,
		ok: 'OK!' ,
		nope: 'Nope!'
	}
} ) ;

notif.on( 'action' , function( action ) {
	console.log( "Action '%s' was clicked!" , action ) ;
} ) ;

notif.on( 'close' , function( closedBy ) {
	console.log( "Closed by: '%s'" , closedBy ) ;
} ) ;

notif.push() ;
```

This popup will have two buttons: *'OK!'* and *'Nope!'*.

The *default* action does not create a button, it is the default action produced when the user click the notification itself,
but not any button.

If the user click the notification, the *action* event will be emitted with either *'default'*, *'ok'* or *'nope'*.

The *close* event will be emitted when the notification is closed. If an *action* event was emitted, the *close* event will
be emitted after.

If the user close the notification (using the close button), or if the notification time out, no *action* event will be emitted.



## API reference

**Table of content:**

* [.init()](#ref.init)
* [.setAppName()](#ref.setAppName)
* [.getServerInfo()](#ref.getServerInfo)
* [.getCapabilities()](#ref.getCapabilities)
* [.createNotification()](#ref.createNotification)
* [The Notification class](#ref.notification)
	* [.push()](#ref.notification.push)
	* [.close()](#ref.notification.close)
	* [.set()](#ref.notification.update)
* [Limitations](#ref.limitations)



<a name="ref.init"></a>
### .init( [ callback ] )

* callback `Function` (optional) triggered when the lib is initialized

This method will init the lib.
Basically, it connects to D-Bus and get the *org.freedesktop.Notifications* service and interface.

**Note that you do not need to call this method, it is automatically called the first time you push a notification or when
you try to get some informations out of the server.**



<a name="ref.setAppName"></a>
### .setAppName( appName )

* appName `string` (non-empty) the name of the application

This will configure the application name.
The application name is **NOT** displayed.



<a name="ref.getServerInfo"></a>
### .getServerInfo()

Returns an object containing server info, where:

* name `string` the name of the server (e.g. "gnome-shell")
* vendor `string` the vendor name (e.g. "GNOME")
* version `string` the version of the server
* specVersion `string` the version of the *org.freedesktop.Notifications* spec implemented by the server



<a name="ref.getCapabilities"></a>
### .getCapabilities()

Returns an array of string containing the server capabilities.

E.g.: `[ 'actions', 'body', 'body-markup', 'icon-static', 'persistence', 'sound' ]`.

From [Gnome.org](https://developer.gnome.org/notification-spec/):

* *action-icons*: Supports using icons instead of text for displaying actions. Using icons for actions must be enabled on a
  per-notification basis using the *action-icons* hint.
* *actions*: The server will provide the specified actions to the user. Even if this cap is missing, actions may still be specified
  by the client, however the server is free to ignore them.
* *body*: Supports body text. Some implementations may only show the summary (for instance, onscreen displays, marquee/scrollers)
* *body-hyperlinks*: The server supports hyperlinks in the notifications.
* *body-images*: The server supports images in the notifications.
* *body-markup*: Supports markup in the body text. If marked up text is sent to a server that does not give this cap, the markup
  will show through as regular text so must be stripped clientside.
* *icon-multi*: The server will render an animation of all the frames in a given image array. The client may still specify multiple
  frames even if this cap and/or *icon-static* is missing, however the server is free to ignore them and use only the primary frame.
* *icon-static*: Supports display of exactly 1 frame of any given image array. This value is mutually exclusive with *icon-multi*,
  it is a protocol error for the server to specify both.
* *persistence*: The server supports persistence of notifications. Notifications will be retained until they are acknowledged or
  removed by the user or recalled by the sender. The presence of this capability allows clients to depend on the server to
  ensure a notification is seen and eliminate the need for the client to display a reminding function (such as a status icon)
  of its own.
* *sound*: The server supports sounds on notifications. If returned, the server must support the *sound-file* and *suppress-sound*
  hints. 



<a name="ref.createNotification"></a>
### .createNotification( properties )

* properties `Object` contains the data of the notification, where:
	* summary `string` the title/summary of the notification
	* body `string` the body of the notification, supporting HTML tags `<b>`, `<i>` and `<u>`
	* icon `string` (optional) either a full path to an image, or a stock image existing on your desktop environment, 
	  e.g. "appointment-new".
	* sound `string` (optional) either a full path to a sound file to play when the notification pop up or a themeable named sound
	  from the *freedesktop.org* [sound naming spec](http://0pointer.de/public/sound-naming-spec.html)
	   to play when the notification pops up. Similar to icon-name, only for sounds. An example would be "message-new-instant".
	* urgency `mixed` (optional, default to 1/*normal*) this is the urgency level for this notification, the value can be:
		* 0/*low*
		* 1/*normal*
		* 2/*critical* (critical notification does not timeout)
	* timeout `number` (optional) the timeout before the notification disappears in *ms* (rarely implemented by notification servers)
	* appName `string` (optional) override the global application name
	* category `string` (optional) a category name, **NOT** displayed, probably useful for the notification server but not mandatory.
	  Most probably some notification servers will provide filters to users somewhere in the future, and this category would be
	  used for that.
	* actions `Object` an object of actions, with the action codename as the key and the label of the button (`string`) as the value,
	  e.g. `{ ok: 'OK!' , cancel: 'Cancel...' }`. Note that *default* (as the key/codename) is a special case for a click on
	  the notification body itself, so its value/label is ignored.
	* antiLeakTimeout `number` the timeout in ms before giving up. This defines a period of time after which the notification
	  should be assumed to have timed out. This exists because many notification servers (e.g. Gnome) do not send any event
	  when a notification has actually timed out. See [the limitations section](#ref.limitations) to understand what happens
	  behind the scene.
	* *any other key* will be turned into a *hint*, see the [Gnome documentation](https://developer.gnome.org/notification-spec/)
	  for the list of all well-known hints

It creates and returns a `Notification` object having the aforementioned properties.



<a name="ref.notification"></a>
## Notification Class

Instances of this *class* represent a notification about to be sent.



<a name="ref.notification.set"></a>
### Notification#set( properties )

* properties `Object` contains the data of the notification, where:
	* summary `string` the title/summary of the notification
	* body `string` the body of the notification, supporting HTML tags `<b>`, `<i>` and `<u>`
	* icon `string` (optional) either a full path to an image, or a stock image existing on your desktop environment, 
	  e.g. "appointment-new".
	* sound `string` (optional) either a full path to a sound file to play when the notification pop up or a themeable named sound
	  from the *freedesktop.org* [sound naming spec](http://0pointer.de/public/sound-naming-spec.html)
	   to play when the notification pops up. Similar to icon-name, only for sounds. An example would be "message-new-instant".
	* urgency `mixed` (optional, default to 1/*normal*) this is the urgency level for this notification, the value can be:
		* 0/*low*
		* 1/*normal*
		* 2/*critical* (critical notification does not timeout)
	* timeout `number` (optional) the timeout before the notification disappears in *ms* (rarely implemented by notification servers)
	* appName `string` (optional) override the global application name
	* category `string` (optional) a category name, **NOT** displayed, probably useful for the notification server but not mandatory.
	  Most probably some notification servers will provide filters to users somewhere in the future, and this category would be
	  used for that.
	* actions `Object` an object of actions, with the action codename as the key and the label of the button (`string`) as the value,
	  e.g. `{ ok: 'OK!' , cancel: 'Cancel...' }`. Note that *default* (as the key/codename) is a special case for a click on
	  the notification body itself, so its value/label is ignored.
	* antiLeakTimeout `number` the timeout in ms before giving up. This defines a period of time after which the notification
	  should be assumed to have timed out. This exists because many notification servers (e.g. Gnome) do not send any event
	  when a notification has actually timed out. See [the limitations section](#ref.limitations) to understand what happens
	  behind the scene.
	* *any other key* will be turned into a *hint*, see the [Gnome documentation](https://developer.gnome.org/notification-spec/)
	  for the list of all well-known hints

Set/reset properties after the `Notification` object creation.

This accepts exactly the same properties the constructor does.



<a name="ref.notification.push"></a>
### Notification#push( [callback] ) 

* callback `Function` (optional) a callback that will be triggered when the notification is sent to the server

This will send the notification to the notification server so it will be displayed as soon as possible, usually as soon as
the previous notification is dismissed. This is totally dependent to your desktop environment (some implementation may
allow multiple notifications at the same time, but as far as I know, there is no desktop doing that at the moment).



<a name="ref.notification.close"></a>
### Notification#close( [callback] )

* callback `Function` (optional) a callback that will be triggered when the close request is sent to the server

This close the notification right now.



<a name="ref.events"></a>
## Events

<a name="ref.events.action"></a>
### *action* event ( action )

* action `string` the action ID of the button the user clicked

This event is emitted on a notification when a user as clicked a button or the notification's body (if the *default* action was set).

The *action* string can be anything: it is the key of one of the property of the `actions` property that was passed to
the `Notification` constructor.



<a name="ref.events.close"></a>
### *close* event ( closedBy )

* closedBy `string` the closed reason

This event is emitted when a notification is closed.

The *closedBy* string indicate the reason why the notification was closed.

It can be one of:

* *timeout*: the notification has timed out. **Note that this code can eventually be sent by the notification server
  when a notification is closed in favor of a more urgent one.**
* *user*: the user itself closed the notification, either by clicking the notification body, the notification close button or
  one of the button of the notification.
* *client*: the client (i.e. the app) closed the notification, this typically happens when your app has called the `.close()`
  method on the notification object.
* *antiLeak*: the `antiLeakTimeout` has been reached and has closed the notification.



<a name="ref.limitations"></a>
## Limitations

Sending a notification in a *fire and forget* fashion works pretty well.

However, advanced features like buttons are somewhat broken by design in the *org.freedesktop.Notifications* spec and
particularly on notification server implementations.

**In fact we are not guaranteed to get a signal when the server time out a notification**.

That's it: the notification server can tell you if  the user clicked the notification, if a particular button is clicked,
or if the user closed the notification, **BUT NOT IF THE SERVER HAS TIMED OUT YOUR NOTIFICATION!!!**

For *fire and forget* it's not important, but if you want to send notifications with buttons,
that's a real problem: as time pass without any callback triggered, how do we know if the notification is still displayed and
the user is simply away from keyboard (thus an action callback has still a chance to be triggered) or if the notification has
been timed out and dismissed by the notification server itself.

Also there no signal/event telling when a notification is actually displayed on screen, so there is no mechanism to know if the
notification is displayed or is still queued.

So you should be aware that:

* as soon as you add *one* button to your notification, **the urgency level is forced to 'critical'**, because critical notifications
  never expire
* because we can't detect notification expiration, *freedesktop-notifications* assumes by default that the notification
  has expired after 30s for *'low'* and *'normal'* urgency notification, and after 10 minutes for *'critical'* notification:
  this is important to avoid leaking event listeners like hell. However this can be overridden by setting the property 
  `antiLeakTimeout` to the appropriate value. When the `antiLeakTimeout` kick in, **a close request is sent to the server,
  just in case it was still on screen (or queued).** This is to avoid to have a dialog with buttons that are not responding anymore.
* you can update a *living* notification (i.e: a notification currently displayed), but some server (e.g. Gnome) will remove
  any existing buttons or buttons about to be created (despite the fact that actions are correctly pushed to D-Bus)...
  so you would probably want to close the notification and create a brand new one if that notification involves buttons.



## License

MIT License. See the `LICENSE` file.
