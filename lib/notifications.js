/*
	The Cedric's Swiss Knife (CSK) - CSK Freedesktop Notifications

	Copyright (c) 2015 Cédric Ronvel 
	
	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/



// Load modules
var dbus = require( 'dbus-native' ) ;
var events = require( 'events' ) ;



var notifications = Object.create( events.prototype ) ;
module.exports = notifications ;



var isInit = false ;
var initInProgress = false ;
var sessionBus ;
var interface ;



notifications.init = function init( callback )
{
	if ( isInit ) { callback() ; return ; }
	if ( initInProgress ) { notifications.once( 'ready' , callback ) ; return ; }
	
	initLevel = 1 ;
	sessionBus = dbus.sessionBus() ;
	
	sessionBus
		.getService( 'org.freedesktop.Notifications' )
		.getInterface(
			'/org/freedesktop/Notifications',
			'org.freedesktop.Notifications',
			function( error , interface_ ) {
				if ( error ) { callback( error ) ; return ; }
				interface = interface_ ;
				
				interface.on( 'ActionInvoked' , onAction ) ;
				notifications.on( 'NotificationClosed' , onClose ) ;
				
				notifications.emit( 'ready' ) ;
				callback() ;
			}
		) ;
} ;



function onAction() {
	console.log( 'ActionInvoked' , arguments ) ;
} ;



function onClose() {
	console.log( 'NotificationClosed' , arguments ) ;
} ;



notifications.getCapabilities = function getCapabilities( callback )
{
	interface.GetCapabilities( function( error , caps ) {
		console.log( "Caps:" , caps ) ;
		callback( error , caps ) ;
	} ) ;
} ;



function Notification( data ) { return notifications.createNotification( data ) ; }
notifications.Notification = Notification ;
Notification.prototype = Object.create( events.prototype ) ;
Notification.prototype.constructor = Notification ;



notifications.createNotification = function createNotification( data )
{
	var notif = Object.create( Notification.prototype ) ;
	
	notif.appName = data.appName || 'node' ; delete data.appName ;
	notif.id = 0 ; delete data.id ;
	notif.iconPath = data.iconPath || '' ; delete data.iconPath ;
	notif.summary = data.summary || '' ; delete data.summary ;
	notif.body = data.body || '' ; delete data.body ;
	notif.actions = data.actions || [] ; delete data.actions ;
	notif.timeout = data.timeout || 0 ; delete data.timeout ;
	notif.hints = data ;
	
	return notif ;
} ;



Notification.prototype.push = function push()
{
	var self = this ;
	
	if ( ! isInit ) { notifications.init( this.push.bind( this ) ) ; return ; }
	
	interface.Notify(
		this.appName ,
		this.id ,
		this.iconPath ,
		this.summary ,
		this.body ,
		notifications.toPairs( this.actions ) ,
		notifications.toDict( this.hints ) ,
		this.timeout ,
		
		function( error , id ) {
			//if ( error ) { self.emit( error ) ; return ; }
			console.log( "ID:" , id ) ;
			self.id = id ;
			
			//setTimeout(function() { n.CloseNotification(id, console.log); }, 4000);
		}
	) ;
} ;



Notification.prototype.close = function close()
{
	var self = this ;
	
	if ( ! isInit ) { notifications.init( this.push.bind( this ) ) ; return ; }
	
	interface.CloseNotification( this.id , function( error ) {
		console.log( "CloseNotification:" , arguments ) ;
	} ) ;
} ;




// Non-nested object/dict
notifications.toDict = function toDict( object )
{
	var k , type , dict = [] ;
	
	for ( k in object )
	{
		switch ( typeof object[ k ] )
		{
			case 'string' :
				t = 's' ;
				break ;
			case 'number' :
				if ( object[ k ] === Math.floor( object[ k ] ) ) { t = 'i' ; }
				else { t = 'd' ; }
				break ;
			case 'boolean' :
				t = 'b' ;
				break ;
			default :
				continue ;
		}
		
		dict.push( [ k , [ t , object[ k ] ] ] ) ;
	}
	
	return dict ;
} ;



notifications.toPairs = function toPairs( object )
{
	var k , type , pairs = [] ;
	
	for ( k in object )
	{
		pairs.push( k ) ;
		pairs.push( object[ k ] ) ;
	}
	
	return pairs ;
} ;






return ;


sessionBus.getService('org.freedesktop.Notifications').getInterface(
	'/org/freedesktop/Notifications',
	'org.freedesktop.Notifications', function( error , notifications ) {
		
		// dbus signals are EventEmitter events 
		
		notifications.GetCapabilities( function( error , caps ) {
			console.log( "Caps:" , caps ) ;
		} ) ;
		
	}
) ;



return ;






function Notification( data ) { return libnotify.createNotification( data ) ; }
libnotify.Notification = Notification ;



libnotify.createNotification = function createNotification( data )
{
	if ( ! isInit ) { libnotify.init() ; }
	
	var notification = Object.create( Notification.prototype , {
		internalNotification: { value: null , enumerable: true , writable: true } ,
		pushed: { value: false , enumerable: true , writable: true } ,
		summary: { value: '' , enumerable: true , writable: true } ,
		id: { value: null , enumerable: true , writable: true } ,
		body: { value: null , enumerable: true , writable: true } ,
		iconPath: { value: null , enumerable: true , writable: true } ,
		urgency: { value: 1 , enumerable: true , writable: true } ,
		timeout: { value: -1 , enumerable: true , writable: true } ,
		appName: { value: null , enumerable: true , writable: true } ,
		category: { value: null , enumerable: true , writable: true } ,
		actions: { value: null , enumerable: true , writable: true } ,
		runningLoop: { value: false , enumerable: true , writable: true }
	} ) ;
	
	notification.update( data ) ;
	
	return notification ;
} ;



function notificationCallback( actionId , userData , userCallback )
{
	//console.log( ">>>> notificationCallback:" , arguments ) ;
	if ( typeof userCallback === 'function' ) { userCallback( this , actionId , userData ) ; }
	if ( this.runningLoop ) { this.stopLoop() ; }
}



// Create the notification on the C-lib side
Notification.prototype.create = function create()
{
	var k ;
	
	if ( this.internalNotification ) { return ; }
	
	this.internalNotification = libnotify.lib.notify_notification_new( this.summary , this.body , this.iconPath ) ;
	
	if ( this.timeout !== -1 )
	{
		libnotify.lib.notify_notification_set_timeout( this.internalNotification , this.timeout ) ;
	}
	
	if ( this.appName )
	{
		libnotify.lib.notify_notification_set_app_name( this.internalNotification , this.appName ) ;
	}
	
	if ( this.category )
	{
		libnotify.lib.notify_notification_set_category( this.internalNotification , this.category ) ;
	}
	
	if ( this.actions )
	{
		for ( k in this.actions )
		{
			//console.log( '>>>>>>>' , k , ':' , this.actions[ k ] ) ;
			
			libnotify.lib.notify_notification_add_action(
				this.internalNotification ,
				k ,
				this.actions[ k ].label ,
				this.actions[ k ].callback ,
				null ,	// don't bother the lib with this userData stuff here, let the JS callback handle that for us
				null	// we don't send userData to the lib, so we don't care about the GFreeFunc
			) ;
			
			// Always set urgency to 'critical' when an action callback is set: the dialog box should not disappear!
			this.urgency = 2 ;
		}
	}
	
	if ( this.urgency !== 1 )
	{
		libnotify.lib.notify_notification_set_urgency( this.internalNotification , this.urgency ) ;
	}
} ;



Notification.prototype.update = function update( data )
{
	var k , action , ret , gerror ;
	
	if ( data.summary || data.body || data.iconPath )
	{
		if ( data.summary ) { this.summary = data.summary ; }
		if ( data.body ) { this.body = data.body ; }
		if ( data.iconPath ) { this.iconPath = data.iconPath ; }
		
		if ( this.internalNotification )
		{
			libnotify.lib.notify_notification_update( this.internalNotification , this.summary , this.body , this.iconPath ) ;
		}
	}
	
	
	if ( typeof data.timeout === 'number' )
	{
		this.timeout = Math.round( data.timeout ) ;
		
		if ( this.internalNotification )
		{
			libnotify.lib.notify_notification_set_timeout( this.internalNotification , this.timeout ) ;
		}
	}
	
	if ( typeof data.appName === 'string' )
	{
		this.appName = data.appName ;
		
		if ( this.internalNotification )
		{
			libnotify.lib.notify_notification_set_app_name( this.internalNotification , this.appName ) ;
		}
	}
	
	if ( typeof data.category === 'string' )
	{
		this.category = data.category ;
		
		if ( this.internalNotification )
		{
			libnotify.lib.notify_notification_set_category( this.internalNotification , this.category ) ;
		}
	}
	
	if ( data.actions !== undefined )
	{
		if ( this.actions && this.internalNotification )
		{
			libnotify.lib.notify_notification_clear_actions( this.internalNotification ) ;
		}
		
		if ( typeof data.actions === 'object' )
		{
			this.actions = {} ;
			
			for ( k in data.actions )
			{
				action = data.actions[ k ] ;
				
				if ( ! action || typeof action !== 'object' ) { continue ; }
				
				if ( ! action.label ) { action.label = ' ' ; }
				if ( ! action.userData ) { action.userData = null ; }
				
				if ( k === 'close' )
				{
					// 'close' is a special case
					this.closeAction = notificationCallback.bind( this , k , action.userData , action.callback ) ;
					continue ;
				}
				
				action.callback = notificationCallback.bind( this , k , action.userData , action.callback ) ;
				
				this.actions[ k ] = action ;
				
				// Always set urgency to 'critical' when an action callback is set: the dialog box should not disappear!
				data.urgency = 2 ;
				
				if ( this.internalNotification )
				{
					libnotify.lib.notify_notification_add_action(
						this.internalNotification ,
						k ,
						action.label ,
						action.callback ,
						null ,	// don't bother the lib with this userData stuff here, let the JS callback handle that for us
						null
					) ;
				}
			}
		}
		else
		{
			this.actions = null ;
		}
	}
	
	if ( data.urgency !== undefined && data.urgency !== this.urgency )
	{
		switch ( data.urgency )
		{
			case 0 :
			case 'low' :
				this.urgency = 0 ;
				break ;
			case 1 :
			case 'normal' :
				this.urgency = 1 ;
				break ;
			case 2 :
			case 'critical' :
				this.urgency = 2 ;
				break ;
			default :
				this.urgency = 1 ;
		}
		
		if ( this.internalNotification )
		{
			libnotify.lib.notify_notification_set_urgency( this.internalNotification , this.urgency ) ;
		}
	}
	
	if ( this.pushed )
	{
		gerror = ref.NULL.ref() ;
		ret = libnotify.lib.notify_notification_show( this.internalNotification , gerror ) ;
	}
} ;



function closeCallback()
{
	//console.log( "\n>>>> closeCallback:" , arguments ) ;
	if ( this.closeAction ) { this.closeAction() ; }
	if ( this.runningLoop ) { this.stopLoop() ; }
}



function timeoutCallback()
{
	//console.log( ">>>> timeoutCallback:" , arguments ) ;
	if ( this.runningLoop ) { this.stopLoop() ; }
	return false ;
}



Notification.prototype.show =
Notification.prototype.push = function push( options , finishCallback )
{
	var ret , gerror = ref.NULL.ref() ;
	
	// Arguments management
	if ( typeof options === 'function' ) { finishCallback = options ; options = {} ; }
	else if ( ! options || typeof options !== 'object' ) { options = {} ; }
	
	if ( finishCallback && typeof finishCallback !== 'function' ) { finishCallback = null ; }
	
	
	// Create the notification, if necessary
	if ( ! this.internalNotification ) { this.create() ; }
	
	// Show the notification
	ret = libnotify.lib.notify_notification_show( this.internalNotification , gerror ) ;
	
	// Should be handled by the lib later, creating a JS Error instance
	if ( ! ret ) { return gerror ; }
	
	this.pushed = true ;
	
	// Now the hardest part: manage action callback
	if ( this.actions || finishCallback )
	{
		if ( ! libnotify.gMainLoop ) { libnotify.gMainLoop = libnotify.lib.g_main_loop_new( ref.NULL , false ) ; }
		
		this.runningLoop = true ;
		
		this.signalHandler = libnotify.lib.g_signal_connect_object(
			this.internalNotification ,
			'closed' ,
			closeCallback.bind( this ) ,
			this.internalNotification ,
			0
		) ;
		
		/*
			Soooooooooooooo....... This broken notification lib and spec DO NOT TELL US WHEN THE NOTIF TIMEOUT.
			That's so silly... Once a button with an action callback is set, we NEED to know if the notification is still
			running (i.e. the user is slowly reading the text, or is away from this computer), or if the notification server
			has dismiss it due to timeout.
			
			Fine.
			
			We have 2 things to do to overcome that silly defective design:
				- use node-ffi async execution, so the whole event loop won't be blocked (at the cost of a thread)
				- add a timeout to the g_loop to destroy it in any case, so we are not leaking resource and thread like hell
		*/
		this.timerId = libnotify.lib.g_timeout_add(
			options.timeout || ( this.urgency >= 2 ? 60000 : 10000 ) ,	// default timeout: 60s for critical notif, 10s for others
			timeoutCallback.bind( this ) ,
			ref.NULL
		) ;
		
		libnotify.lib.g_main_loop_run.async( libnotify.gMainLoop , function( error ) {
			//console.log( "Async call finished! Arguments:" , arguments ) ;
			if ( finishCallback ) { finishCallback( error ) ; }
		} ) ;
	}
	
	
	return ;
} ;



Notification.prototype.stopLoop = function stopLoop()
{
	libnotify.lib.g_signal_handler_disconnect(
		this.internalNotification ,
		this.signalHandler
	) ;
	
	this.runningLoop = false ;
	
	libnotify.lib.g_main_loop_quit( libnotify.gMainLoop ) ;
} ;



Notification.prototype.close = function close()
{
	var ret , gerror = ref.NULL.ref() ;
	libnotify.lib.notify_notification_close( this.internalNotification , gerror ) ;
	
	if ( ret ) { return ; }
	
	// Should be handled by the lib later, creating a JS Error instance
	return gerror ;
} ;


